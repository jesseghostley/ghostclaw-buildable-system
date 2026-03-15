import { routeSignalToPlannerAction, type PlannerAction } from '../../planner/src/signal_router';
import type { Plan } from '../../shared/src/types/plan';
import { logEvent } from './event_log';
import { executeJobs } from './job_executor';
import { jobQueue, type QueueJob, type ReviewState } from './job_queue';
import { saveRuntimeState } from './runtime_persistence';
import { attachPlanJobIds, attachPlanWorkflowId, runtimeStore } from './state_store';
import { createWorkflow } from './workflow_orchestrator';
import { normalizeWorkspaceId } from './workspace_registry';

export type Signal = {
  id: string;
  workspaceId: string;
  name: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};

export type Job = QueueJob;

export type Artifact = {
  id: string;
  workspaceId: string;
  jobId: string;
  type: string;
  title: string;
  content: string;
  status: ReviewState;
  createdAt: number;
};

type JobTemplate = {
  jobType: string;
  dependsOn?: number[];
};

function nextId(prefix: string, index: number): string {
  return `${prefix}_${index + 1}`;
}

function createPlan(signal: Signal): Plan {
  const plannerAction = routeSignalToPlannerAction(signal);
  const plan: Plan = {
    id: nextId('plan', runtimeStore.plans.length),
    workspaceId: signal.workspaceId,
    signalId: signal.id,
    plannerAction,
    priority: 'normal',
    requiredAgents: ['RuntimeMonitorAgent'],
    expectedOutputs: ['artifact'],
    status: 'ready',
    createdAt: Date.now(),
    workflowId: undefined,
    jobIds: [],
  };

  logEvent({
    type: 'plan_created',
    entityType: 'plan',
    entityId: plan.id,
    message: `Plan ${plan.id} created from signal ${signal.id} with action ${plan.plannerAction}`,
    metadata: { action: plan.plannerAction, workspaceId: signal.workspaceId },
  });

  return plan;
}

function actionToJobTemplates(action: PlannerAction): JobTemplate[] {
  const templates: Record<PlannerAction, JobTemplate[]> = {
    generate_content_cluster: [
      { jobType: 'research_keyword_cluster' },
      { jobType: 'draft_cluster_outline', dependsOn: [0] },
      { jobType: 'write_article', dependsOn: [1] },
    ],
    optimize_existing_page: [
      { jobType: 'write_service_page' },
      { jobType: 'generate_metadata', dependsOn: [0] },
      { jobType: 'generate_schema', dependsOn: [0] },
    ],
    create_new_skill: [{ jobType: 'scaffold_skill_package' }],
  };

  return templates[action];
}

function createJobs(plan: Plan, signal: Signal): Job[] {
  const templates = actionToJobTemplates(plan.plannerAction as PlannerAction);

  const jobs: Job[] = templates.map((template, index) => ({
    id: nextId('job', runtimeStore.jobs.length + index),
    workspaceId: plan.workspaceId,
    planId: plan.id,
    jobType: template.jobType,
    assignedAgent: null,
    status: template.dependsOn && template.dependsOn.length > 0 ? 'blocked' : 'queued',
    lifecycleState: 'draft',
    blockedReason: template.dependsOn && template.dependsOn.length > 0 ? 'dependency_incomplete' : undefined,
    dependencyJobIds: [],
    parentJobId: undefined,
    workflowId: undefined,
    workflowState: template.dependsOn && template.dependsOn.length > 0 ? 'blocked' : 'ready',
    inputPayload: {
      signalName: signal.name,
      signalPayload: signal.payload ?? null,
    },
    outputPayload: null,
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  jobs.forEach((job, index) => {
    const deps = templates[index].dependsOn ?? [];
    job.dependencyJobIds = deps.map((depIndex) => jobs[depIndex].id);
    job.parentJobId = job.dependencyJobIds[0];
  });

  return jobs;
}

export function processSignal(input: { name: string; payload?: Record<string, unknown>; workspaceId?: string }): {
  signal: Signal;
  plan: Plan;
  jobs: Job[];
  artifacts: Artifact[];
} {
  const workspaceId = normalizeWorkspaceId(input.workspaceId);
  const signal: Signal = {
    id: nextId('signal', runtimeStore.signals.length),
    workspaceId,
    name: input.name,
    payload: input.payload,
    createdAt: Date.now(),
  };
  runtimeStore.signals.push(signal);
  logEvent({
    type: 'signal_received',
    entityType: 'signal',
    entityId: signal.id,
    message: `Signal received in workspace ${workspaceId}: ${signal.name}`,
    metadata: { payload: signal.payload ?? null, workspaceId },
  });

  const plan = createPlan(signal);
  runtimeStore.plans.push(plan);

  const jobs = createJobs(plan, signal);
  runtimeStore.jobs.push(...jobs);
  attachPlanJobIds(plan.id, jobs.map((job) => job.id));

  const workflowId = createWorkflow({ id: plan.id, action: plan.plannerAction, workspaceId: plan.workspaceId }, jobs);
  attachPlanWorkflowId(plan.id, workflowId);
  jobs.forEach((job) => {
    job.workflowId = workflowId;
    jobQueue.enqueue(job);
  });

  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);
  saveRuntimeState();

  return { signal, plan: runtimeStore.plans.find((item) => item.id === plan.id) ?? plan, jobs, artifacts };
}

export function submitSignalToRuntime(input: { name: string; payload?: Record<string, unknown>; workspaceId?: string }) {
  return processSignal(input);
}
