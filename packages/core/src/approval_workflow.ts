import type { Job } from './runtime_loop';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore } from './state_store';

type ApprovalResult = {
  success: boolean;
  error?: string;
  job?: Job;
};

function getJob(jobId: string) {
  return runtimeStore.jobs.find((job) => job.id === jobId);
}

function syncArtifactsForJob(jobId: string, lifecycleState: 'draft' | 'waiting_review' | 'approved' | 'rejected' | 'published') {
  runtimeStore.artifacts.forEach((artifact) => {
    if (artifact.jobId === jobId) {
      artifact.status = lifecycleState;
    }
  });
}

export function submitForReview(jobId: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.status !== 'completed') {
    return { success: false, error: `Only completed jobs can be submitted for review.` };
  }

  job.lifecycleState = 'waiting_review';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'waiting_review');
  saveRuntimeState();

  return { success: true, job };
}

export function approveJob(jobId: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.lifecycleState !== 'waiting_review') {
    return { success: false, error: `Job must be waiting_review before approval.` };
  }

  job.lifecycleState = 'approved';
  job.reviewReason = undefined;
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'approved');
  saveRuntimeState();

  return { success: true, job };
}

export function rejectJob(jobId: string, reason?: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.lifecycleState !== 'waiting_review') {
    return { success: false, error: `Job must be waiting_review before rejection.` };
  }

  job.lifecycleState = 'rejected';
  job.reviewReason = reason?.trim() || 'Rejected by operator';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'rejected');
  saveRuntimeState();

  return { success: true, job };
}

export function publishJob(jobId: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.lifecycleState !== 'approved') {
    return { success: false, error: `Only approved jobs can be published.` };
  }

  job.lifecycleState = 'published';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'published');
  saveRuntimeState();

  return { success: true, job };
}
