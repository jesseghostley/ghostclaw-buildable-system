import { routeSignalToPlannerAction, type PlannerAction } from '../../planner/src/signal_router';
import { executeJobs } from './job_executor';
import { jobQueue, type QueueJob } from './job_queue';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore } from './state_store';

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
  status: 'created' | 'published';
  createdAt: number;
};

function nextId(prefix: string, index: number): string {
  return `${prefix}_${index + 1}`;
}

function createPlan(signal: Signal): Plan {
  return {
    id: nextId('plan', runtimeStore.plans.length),
    signalId: signal.id,
    action: routeSignalToPlannerAction(signal),
    createdAt: Date.now(),
  };
}

function createJobs(plan: Plan, signal: Signal): Job[] {
  const jobTypeByAction: Record<PlannerAction, string[]> = {
    generate_content_cluster: ['draft_cluster_outline'],
    optimize_existing_page: ['refresh_page_sections'],
    create_new_skill: ['scaffold_skill_package'],
  };

  return jobTypeByAction[plan.action].map((jobType, index) => ({
    id: nextId('job', runtimeStore.jobs.length + index),
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
} {
  const signal: Signal = {
    id: nextId('signal', runtimeStore.signals.length),
    name: input.name,
    payload: input.payload,
    createdAt: Date.now(),
  };
  runtimeStore.signals.push(signal);

  const plan = createPlan(signal);
  runtimeStore.plans.push(plan);

  const jobs = createJobs(plan, signal);
  jobs.forEach((job) => jobQueue.enqueue(job));
  runtimeStore.jobs.push(...jobs);

  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);
  saveRuntimeState();

  return { signal, plan, jobs, artifacts };
}
