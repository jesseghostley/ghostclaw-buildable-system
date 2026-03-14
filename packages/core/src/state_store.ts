import type { Artifact, Job, Plan, Signal } from './runtime_loop';

export type PersistedQueueState = {
  queue: string[];
  executing: string[];
};

export type PersistedRuntimeState = {
  signals: Signal[];
  plans: Plan[];
  jobs: Job[];
  artifacts: Artifact[];
  queue: PersistedQueueState;
};

export const runtimeStore = {
  signals: [] as Signal[],
  plans: [] as Plan[],
  jobs: [] as Job[],
  artifacts: [] as Artifact[],
};

export function applyRuntimeCollections(state: PersistedRuntimeState): void {
  runtimeStore.signals.length = 0;
  runtimeStore.signals.push(...state.signals);

  runtimeStore.plans.length = 0;
  runtimeStore.plans.push(...state.plans);

  runtimeStore.jobs.length = 0;
  runtimeStore.jobs.push(
    ...state.jobs.map((job) => ({
      ...job,
      lifecycleState: job.lifecycleState ?? 'draft',
      workflowState: job.workflowState ?? 'draft',
      dependencyJobIds: job.dependencyJobIds ?? [],
      blockedReason: job.blockedReason,
    })),
  );

  runtimeStore.artifacts.length = 0;
  runtimeStore.artifacts.push(
    ...state.artifacts.map((artifact) => ({
      ...artifact,
      status: artifact.status ?? 'draft',
    })),
  );
}

export function clearRuntimeCollections(): void {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
}
