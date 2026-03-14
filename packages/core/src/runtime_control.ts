import { executeJobs } from './job_executor';
import { jobQueue } from './job_queue';
import { processSignal, runtimeStore } from './runtime_loop';

type ControlResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

function runQueueAndStoreArtifacts() {
  const artifacts = executeJobs();
  runtimeStore.artifacts.push(...artifacts);
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

export function submitTestSignal(signalName: string): ControlResult<{ signalId: string }> {
  if (!signalName || !signalName.trim()) {
    return { success: false, error: 'Signal name is required.' };
  }

  try {
    const result = processSignal({ name: signalName.trim() });
    return { success: true, data: { signalId: result.signal.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit signal.';
    return { success: false, error: message };
  }
}

export function resetRuntimeState(): ControlResult<{ reset: true }> {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  jobQueue.reset();

  return { success: true, data: { reset: true } };
}
