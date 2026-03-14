import type { RuntimeEvent } from '../../shared/src/types/runtime_event';
import type { Artifact, Job, Plan, Signal } from './runtime_loop';
import type { PublishedOutput } from './publisher';
import { DEFAULT_WORKSPACE_ID, normalizeWorkspaceId } from './workspace_registry';

export type PersistedQueueState = {
  queue: string[];
  executing: string[];
};

export type PersistedRuntimeState = {
  signals: Signal[];
  plans: Plan[];
  jobs: Job[];
  artifacts: Artifact[];
  events: RuntimeEvent[];
  publishedOutputs: PublishedOutput[];
  queue: PersistedQueueState;
};

export const runtimeStore = {
  signals: [] as Signal[],
  plans: [] as Plan[],
  jobs: [] as Job[],
  artifacts: [] as Artifact[],
  events: [] as RuntimeEvent[],
  publishedOutputs: [] as PublishedOutput[],
};

export function applyRuntimeCollections(state: PersistedRuntimeState): void {
  runtimeStore.signals.length = 0;
  runtimeStore.signals.push(
    ...state.signals.map((signal) => ({
      ...signal,
      workspaceId: normalizeWorkspaceId(signal.workspaceId),
    })),
  );

  runtimeStore.plans.length = 0;
  runtimeStore.plans.push(
    ...state.plans.map((plan) => ({
      ...plan,
      workspaceId: normalizeWorkspaceId(plan.workspaceId),
    })),
  );

  runtimeStore.jobs.length = 0;
  runtimeStore.jobs.push(
    ...state.jobs.map((job) => ({
      ...job,
      workspaceId: normalizeWorkspaceId(job.workspaceId),
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
      workspaceId: normalizeWorkspaceId(artifact.workspaceId),
      status: artifact.status ?? 'draft',
    })),
  );

  runtimeStore.events.length = 0;
  runtimeStore.events.push(
    ...(state.events ?? []).map((event) => ({
      ...event,
      metadata: {
        ...(event.metadata ?? {}),
        workspaceId: normalizeWorkspaceId((event.metadata?.workspaceId as string | undefined) ?? DEFAULT_WORKSPACE_ID),
      },
    })),
  );

  runtimeStore.publishedOutputs.length = 0;
  runtimeStore.publishedOutputs.push(
    ...(state.publishedOutputs ?? []).map((output) => ({
      ...output,
      workspaceId: normalizeWorkspaceId(output.workspaceId),
    })),
  );
}



type StarterSeedInput = {
  signals?: Signal[];
  artifacts?: Artifact[];
};

export function seedStarterRecords(input: StarterSeedInput): void {
  if (input.signals && input.signals.length > 0) {
    runtimeStore.signals.push(...input.signals.map((signal) => ({
      ...signal,
      workspaceId: normalizeWorkspaceId(signal.workspaceId),
    })));
  }

  if (input.artifacts && input.artifacts.length > 0) {
    runtimeStore.artifacts.push(...input.artifacts.map((artifact) => ({
      ...artifact,
      workspaceId: normalizeWorkspaceId(artifact.workspaceId),
      status: artifact.status ?? 'draft',
    })));
  }
}

export function clearRuntimeCollections(): void {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.events.length = 0;
  runtimeStore.publishedOutputs.length = 0;
}
