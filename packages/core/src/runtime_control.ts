import { executeJobs } from './job_executor';
import { logEvent } from './event_log';
import { jobQueue } from './job_queue';
import { resetPersistedState, saveRuntimeState } from './runtime_persistence';
import { processSignal } from './runtime_loop';
import { runtimeStore } from './state_store';

type ControlResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

function runQueueAndStoreArtifacts() {
  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);
  saveRuntimeState();
  return artifacts;
}

export function retryJob(jobId: string): ControlResult<{ jobId: string }> {
  const job = jobQueue.get(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.status !== 'failed') {
    return { success: false, error: `Job ${jobId} is not failed.` };
  }

  job.retryCount += 1;
  job.outputPayload = null;
  job.assignedAgent = null;
  jobQueue.requeue(jobId);
  runQueueAndStoreArtifacts();

  return { success: true, data: { jobId } };
}

export function requeueJob(jobId: string): ControlResult<{ jobId: string }> {
  const job = jobQueue.get(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.status !== 'failed' && job.status !== 'blocked') {
    return { success: false, error: `Job ${jobId} is not blocked or failed.` };
  }

  job.outputPayload = null;
  job.assignedAgent = null;
  jobQueue.requeue(jobId);
  runQueueAndStoreArtifacts();

  return { success: true, data: { jobId } };
}

export function submitTestSignal(signalName: string, workspaceId?: string): ControlResult<{ signalId: string }> {
  if (!signalName || !signalName.trim()) {
    return { success: false, error: 'Signal name is required.' };
  }

  try {
    const result = processSignal({ name: signalName.trim(), workspaceId });
    return { success: true, data: { signalId: result.signal.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit signal.';
    return { success: false, error: message };
  }
}

export function resetRuntimeState(): ControlResult<{ reset: true }> {
  resetPersistedState();
  logEvent({
    type: 'runtime_reset',
    entityType: 'runtime',
    entityId: 'runtime',
    message: 'Runtime state reset by operator',
  });
  saveRuntimeState();
  return { success: true, data: { reset: true } };
}
