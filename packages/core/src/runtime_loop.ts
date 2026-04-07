import { routeSignal, type PlannerAction } from '../../planner/src/signal_router';
import type { StrategyType } from '../../shared/src/types/planner_strategy';
import { getPlannerStrategy } from './planner_registry';
import { executeJobs, executeOneJob } from './job_executor';
import { jobQueue, type QueueJob } from './job_queue';
import { skillInvocationStore, type SkillInvocation } from './skill_invocation';
import { assignmentStore, type Assignment } from './assignment';
import { eventBus } from './event_bus';
import type { RuntimeContext } from './runtime_context';

/**
 * =============================================================================
 * GHOSTCLAW RUNTIME OBJECT — CANONICAL TYPE LOCATIONS
 * =============================================================================
 * This mapping table shows where each canonical runtime object (as defined in
 * ghostclaw_runtime_persistence_spec.md § 2) is implemented in TypeScript.
 *
 * Object           TypeScript Type        Store / Source File
 * ─────────────────────────────────────────────────────────────────────────────
 * Signal           Signal                 packages/core/src/runtime_loop.ts
 * Plan             Plan                   packages/core/src/runtime_loop.ts
 * Job              Job (= QueueJob)        packages/core/src/job_queue.ts
 * Assignment       Assignment             packages/core/src/assignment.ts
 * SkillInvocation  SkillInvocation        packages/core/src/skill_invocation.ts
 * Artifact         Artifact               packages/core/src/runtime_loop.ts
 * PublishEvent     PublishEvent           packages/core/src/publish_event.ts
 * AuditLogEntry    AuditLogEntry          packages/core/src/audit_log.ts
 * WorkspacePolicy  WorkspacePolicy        packages/core/src/workspace_policy.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Runtime chain:
 *   Signal → Plan → Job → Assignment → SkillInvocation → Artifact → PublishEvent
 *
 * Cross-cutting:
 *   AuditLogEntry  (append-only; every consequential event)
 *   WorkspacePolicy (declarative rules enforced at execution time)
 * =============================================================================
 */

export type Signal = {
  id: string;
  name: string;
  payload?: Record<string, unknown>;
  createdAt: number;
  // TODO(schema-alignment): workspaceId — SHOULD be present for multi-tenant
  //   durable deployments (ghostclaw_runtime_persistence_spec.md § 4.3, item 2).
  //   Deferred until workspace scoping is introduced at the API layer.
};

export type Plan = {
  id: string;
  signalId: string;
  action: PlannerAction;
  strategyId: string;
  strategyType: StrategyType;
  createdAt: number;

  // --- Optional fields (sourced from PlannerDecision) ---

  /** Planning priority derived from PlannerDecision.priority. */
  priority?: number;
  /** Agent names required to execute this plan. */
  requiredAgents?: string[];
  /** Expected artifact types for this plan. */
  expectedOutputs?: string[];
  // TODO(schema-alignment): workspaceId — SHOULD be present for multi-tenant
  //   durable deployments (ghostclaw_runtime_persistence_spec.md § 4.3, item 2).
  //   Deferred until workspace scoping is introduced at the API layer.
};

export type Job = QueueJob;

export type Artifact = {
  id: string;
  jobId: string;
  skillInvocationId: string;
  type: string;
  content: string;
  createdAt: number;

  // --- Optional fields ---

  // TODO(schema-alignment): workspaceId — SHOULD be present for multi-tenant
  //   durable deployments (ghostclaw_runtime_persistence_spec.md § 4.3, item 2).
  //   Deferred until workspace scoping is introduced at the API layer.
  workspaceId?: string;
  /** External storage reference (S3 key, file path) for large artifact content. */
  contentUri?: string;
  /** MIME type of the artifact content. */
  mimeType?: string;
  /** Size of the artifact content in bytes. */
  sizeBytes?: number;
  /** SHA-256 hash for content integrity verification. */
  checksum?: string;
  /** Timestamp when the artifact passed validation by the Guardian archetype. */
  validatedAt?: number;
  /** One of: 'pending' | 'pass' | 'fail'. Defaults to 'pending' when not set. */
  validationStatus?: 'pending' | 'pass' | 'fail';
};

/**
 * In-memory accumulator for backward compatibility.  When no RuntimeContext
 * is passed, processSignal() populates this object so existing tests and
 * API routes continue to work unchanged.
 */
export const runtimeStore = {
  signals: [] as Signal[],
  plans: [] as Plan[],
  jobs: [] as Job[],
  artifacts: [] as Artifact[],
  skillInvocations: [] as SkillInvocation[],
  assignments: [] as Assignment[],
};

let _signalCounter = 0;
let _planCounter = 0;
let _jobCounter = 0;

export function resetIdCounters(): void {
  _signalCounter = 0;
  _planCounter = 0;
  _jobCounter = 0;
}

function nextSignalId(): string {
  return `signal_${++_signalCounter}`;
}

function nextPlanId(): string {
  return `plan_${++_planCounter}`;
}

function nextJobId(): string {
  return `job_${++_jobCounter}`;
}

function createPlan(signal: Signal): Plan {
  const decision = routeSignal(signal);
  const strategy = getPlannerStrategy(decision.strategyId);
  return {
    id: nextPlanId(),
    signalId: signal.id,
    action: decision.plannerAction,
    strategyId: decision.strategyId,
    strategyType: strategy?.strategyType ?? 'rule',
    priority: decision.priority,
    requiredAgents: decision.requiredAgents,
    expectedOutputs: decision.expectedOutputs,
    createdAt: Date.now(),
  };
}

const jobTypeByAction: Record<PlannerAction, string[]> = {
  generate_content_cluster: ['draft_cluster_outline'],
  optimize_existing_page: ['refresh_page_sections'],
  create_new_skill: ['scaffold_skill_package'],
  handle_runtime_error: ['run_diagnostics'],
  build_contractor_site: ['build_site_page'],
};

export function processSignal(
  input: Pick<Signal, 'name' | 'payload'>,
  ctx?: RuntimeContext,
): {
  signal: Signal;
  plan: Plan;
  jobs: Job[];
  artifacts: Artifact[];
  skillInvocations: SkillInvocation[];
  assignments: Assignment[];
} {
  // Resolve stores: use context if provided, otherwise fall back to singletons
  const jobStore = ctx?.stores.jobStore ?? jobQueue;
  const siStore = ctx?.stores.skillInvocationStore ?? skillInvocationStore;
  const aStore = ctx?.stores.assignmentStore ?? assignmentStore;
  const bus = ctx?.eventBus ?? eventBus;

  const signal: Signal = {
    id: nextSignalId(),
    name: input.name,
    payload: input.payload,
    createdAt: Date.now(),
  };

  // Persist to store if context provided
  if (ctx) {
    ctx.stores.signalStore.create(signal);
  }
  runtimeStore.signals.push(signal);
  bus.emit('signal.received', signal);

  const plan = createPlan(signal);
  if (ctx) {
    ctx.stores.planStore.create(plan);
  }
  runtimeStore.plans.push(plan);
  bus.emit('plan.created', plan);

  const jobTypes = jobTypeByAction[plan.action];
  const allJobs: Job[] = [];
  const allArtifacts: Artifact[] = [];
  let stepContext: Record<string, unknown> = {};

  // Execute jobs sequentially, forwarding each job's output as stepContext to the next.
  for (let i = 0; i < jobTypes.length; i++) {
    const job: Job = {
      id: nextJobId(),
      planId: plan.id,
      jobType: jobTypes[i],
      assignedAgent: null,
      status: 'queued',
      inputPayload: {
        signalName: signal.name,
        signalPayload: signal.payload ?? null,
        ...(Object.keys(stepContext).length > 0 ? { stepContext } : {}),
      },
      outputPayload: null,
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    jobStore.enqueue(job);
    bus.emit('job.queued', job);
    allJobs.push(job);

    const artifact = executeOneJob(job.id, ctx);
    if (artifact) {
      allArtifacts.push(artifact);
      bus.emit('artifact.created', artifact);

      // Persist artifact to store if context provided
      if (ctx) {
        ctx.stores.artifactStore.create(artifact);
      }

      // Forward this job's output to the next step
      if (job.outputPayload) {
        stepContext = { ...stepContext, [job.jobType]: job.outputPayload };
      }
    } else {
      // Job failed — stop the chain
      break;
    }
  }

  runtimeStore.jobs.push(...allJobs);
  runtimeStore.artifacts.push(...allArtifacts);

  const jobIds = new Set(allJobs.map((j) => j.id));

  const newInvocations = siStore.listAll().filter(
    (inv) => jobIds.has(inv.jobId),
  );
  runtimeStore.skillInvocations.push(...newInvocations);

  const newAssignments = aStore.listAll().filter(
    (asgn) => jobIds.has(asgn.jobId),
  );
  runtimeStore.assignments.push(...newAssignments);

  return { signal, plan, jobs: allJobs, artifacts: allArtifacts, skillInvocations: newInvocations, assignments: newAssignments };
}
