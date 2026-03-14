import { routeSignalToPlannerAction, type PlannerAction } from '../../planner/src/signal_router';
import { logEvent } from './event_log';
import { executeJobs } from './job_executor';
import { jobQueue, type QueueJob, type ReviewState } from './job_queue';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore } from './state_store';
import { createWorkflow } from './workflow_orchestrator';

export type Signal = {
  id: string;
  name: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};

export type Plan = {
  id: string;
  signalId: string;
  action: PlannerAction;
  createdAt: number;
};

export type Job = QueueJob;

export type Artifact = {
  id: string;
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
  const plan = {
    id: nextId('plan', runtimeStore.plans.length),
    signalId: signal.id,
    action: routeSignalToPlannerAction(signal),
    createdAt: Date.now(),
  };

  logEvent({
    type: 'plan_created',
    entityType: 'plan',
    entityId: plan.id,
    message: `Plan ${plan.id} created for signal ${signal.id}`,
    metadata: { action: plan.action },
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
    create_new_skill: [
      { jobType: 'scaffold_skill_package' },
    ],
  };

  return templates[action];
}

function createJobs(plan: Plan, signal: Signal): Job[] {
  const templates = actionToJobTemplates(plan.action);

  const jobs: Job[] = templates.map((template, index) => ({
    id: nextId('job', runtimeStore.jobs.length + index),
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

export function processSignal(input: Pick<Signal, 'name' | 'payload'>): {
  signal: Signal;
  plan: Plan;
  jobs: Job[];
  artifacts: Artifact[];
} {
  const signal: Signal = {
    id: nextId('signal', runtimeStore.signals.length),
    name: input.name,
    payload: input.payload,
    createdAt: Date.now(),
  };
  runtimeStore.signals.push(signal);
  logEvent({
    type: 'signal_received',
    entityType: 'signal',
    entityId: signal.id,
    message: `Signal received: ${signal.name}`,
    metadata: { payload: signal.payload ?? null },
  });

  const plan = createPlan(signal);
  runtimeStore.plans.push(plan);

  const jobs = createJobs(plan, signal);
  runtimeStore.jobs.push(...jobs);

  const workflowId = createWorkflow(plan, jobs);
  jobs.forEach((job) => {
    job.workflowId = workflowId;
    jobQueue.enqueue(job);
  });

  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);
  saveRuntimeState();

  return { signal, plan, jobs, artifacts };
}
