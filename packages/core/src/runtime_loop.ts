import { routeSignal, type PlannerAction } from '../../planner/src/signal_router';
import type { StrategyType } from '../../shared/src/types/planner_strategy';
import { getPlannerStrategy } from './planner_registry';
import { executeJobs } from './job_executor';
import { jobQueue, type QueueJob } from './job_queue';
import { skillInvocationStore, type SkillInvocation } from './skill_invocation';
import { assignmentStore, type Assignment } from './assignment';
import { eventBus } from './event_bus';
import { getStores } from './store_provider';
import { uniqueId } from './unique_id';
import type { StoreBundle } from './storage/storage_factory';

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

export const runtimeStore = {
  signals: [] as Signal[],
  plans: [] as Plan[],
  jobs: [] as Job[],
  artifacts: [] as Artifact[],
  skillInvocations: [] as SkillInvocation[],
  assignments: [] as Assignment[],
};

/**
 * Populate runtimeStore arrays from the backing stores (SQLite).
 * Called once during startup so that site_generator and other consumers that
 * read runtimeStore see data persisted across restarts.
 *
 * Clears existing arrays first to guarantee idempotency.
 */
export function hydrateRuntimeStore(stores: StoreBundle): void {
  // Clear first so repeated calls don't duplicate entries.
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;

  const signals = stores.signalStore.listAll();
  const plans = stores.planStore.listAll();
  const jobs = stores.jobStore.list();
  const artifacts = stores.artifactStore.listAll();
  const invocations = stores.skillInvocationStore.listAll();
  const assignments = stores.assignmentStore.listAll();

  runtimeStore.signals.push(...signals);
  runtimeStore.plans.push(...plans);
  runtimeStore.jobs.push(...jobs);
  runtimeStore.artifacts.push(...artifacts);
  runtimeStore.skillInvocations.push(...invocations);
  runtimeStore.assignments.push(...assignments);

  console.log(
    `[GhostClaw] Hydrated runtimeStore: ${signals.length} signals, ${plans.length} plans, ` +
      `${jobs.length} jobs, ${artifacts.length} artifacts, ${invocations.length} invocations, ` +
      `${assignments.length} assignments.`,
  );
}

function createPlan(signal: Signal): Plan {
  const decision = routeSignal(signal);
  const strategy = getPlannerStrategy(decision.strategyId);
  return {
    id: uniqueId('plan'),
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

function createJobs(plan: Plan, signal: Signal): Job[] {
  const jobTypeByAction: Record<PlannerAction, string[]> = {
    generate_content_cluster: ['draft_cluster_outline'],
    optimize_existing_page: ['refresh_page_sections'],
    create_new_skill: ['scaffold_skill_package'],
    handle_runtime_error: ['run_diagnostics'],
    build_contractor_website: ['design_site_structure', 'generate_page_content', 'review_and_approve'],
  };

  return jobTypeByAction[plan.action].map((jobType, _index) => ({
    id: uniqueId('job'),
    planId: plan.id,
    jobType,
    assignedAgent: null,
    status: 'queued',
    inputPayload: {
      signalName: signal.name,
      signalPayload: signal.payload ?? null,
    },
    outputPayload: null,
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
}

export function processSignal(input: Pick<Signal, 'name' | 'payload'>): {
  signal: Signal;
  plan: Plan;
  jobs: Job[];
  artifacts: Artifact[];
  skillInvocations: SkillInvocation[];
  assignments: Assignment[];
} {
  // When initializeStores() has been called (production), persist signals,
  // plans, and artifacts to the backing store (SQLite or memory-via-factory).
  // When null (tests that don't call initializeStores), the runtimeStore
  // arrays remain the only storage — preserving existing test behaviour.
  const stores = getStores();

  const signal: Signal = {
    id: uniqueId('signal'),
    name: input.name,
    payload: input.payload,
    createdAt: Date.now(),
  };
  runtimeStore.signals.push(signal);
  stores?.signalStore.create(signal);
  eventBus.emit('signal.received', signal);

  const plan = createPlan(signal);
  runtimeStore.plans.push(plan);
  stores?.planStore.create(plan);
  eventBus.emit('plan.created', plan);

  const jobs = createJobs(plan, signal);
  jobs.forEach((job) => {
    jobQueue.enqueue(job);
    eventBus.emit('job.queued', job);
  });
  runtimeStore.jobs.push(...jobs);

  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);

  artifacts.forEach((artifact) => {
    stores?.artifactStore.create(artifact);
    eventBus.emit('artifact.created', artifact);
  });

  const newInvocations = skillInvocationStore.listAll().filter(
    (inv) => jobs.some((job) => job.id === inv.jobId),
  );
  runtimeStore.skillInvocations.push(...newInvocations);

  const newAssignments = assignmentStore.listAll().filter(
    (asgn) => jobs.some((job) => job.id === asgn.jobId),
  );
  runtimeStore.assignments.push(...newAssignments);

  return { signal, plan, jobs, artifacts, skillInvocations: newInvocations, assignments: newAssignments };
}
