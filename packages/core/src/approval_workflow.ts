import type { Job } from './runtime_loop';
import { logEvent } from './event_log';
import { publishArtifact } from './publisher';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore } from './state_store';
import { getWorkspacePolicy, normalizeWorkspaceId } from './workspace_registry';

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

function maybeAutoApproveJob(job: Job): void {
  const policy = getWorkspacePolicy(job.workspaceId);
  if (!policy.autoApproveArtifacts) {
    return;
  }

  if (job.lifecycleState === 'approved' || job.lifecycleState === 'published') {
    return;
  }

  job.lifecycleState = 'approved';
  job.reviewReason = undefined;
  job.updatedAt = Date.now();
  syncArtifactsForJob(job.id, 'approved');

  logEvent({
    type: 'job_approved',
    entityType: 'job',
    entityId: job.id,
    message: `Job ${job.id} auto-approved by workspace policy`,
    metadata: { workspaceId: normalizeWorkspaceId(job.workspaceId), autoApproved: true },
  });
}

export function submitForReview(jobId: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.status !== 'completed') {
    return { success: false, error: 'Only completed jobs can be submitted for review.' };
  }

  job.lifecycleState = 'waiting_review';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'waiting_review');
  maybeAutoApproveJob(job);

  logEvent({
    type: 'review_submitted',
    entityType: 'job',
    entityId: job.id,
    message: `Job ${job.id} submitted for review`,
    metadata: { workspaceId: normalizeWorkspaceId(job.workspaceId) },
  });
  saveRuntimeState();

  return { success: true, job };
}

export function approveJob(jobId: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.lifecycleState !== 'waiting_review') {
    return { success: false, error: 'Job must be waiting_review before approval.' };
  }

  job.lifecycleState = 'approved';
  job.reviewReason = undefined;
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'approved');
  logEvent({
    type: 'job_approved',
    entityType: 'job',
    entityId: job.id,
    message: `Job ${job.id} approved`,
    metadata: { workspaceId: normalizeWorkspaceId(job.workspaceId) },
  });
  saveRuntimeState();

  return { success: true, job };
}

export function rejectJob(jobId: string, reason?: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  if (job.lifecycleState !== 'waiting_review') {
    return { success: false, error: 'Job must be waiting_review before rejection.' };
  }

  job.lifecycleState = 'rejected';
  job.reviewReason = reason?.trim() || 'Rejected by operator';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'rejected');
  logEvent({
    type: 'job_rejected',
    entityType: 'job',
    entityId: job.id,
    message: `Job ${job.id} rejected`,
    metadata: { reason: job.reviewReason, workspaceId: normalizeWorkspaceId(job.workspaceId) },
  });
  saveRuntimeState();

  return { success: true, job };
}

export function publishJob(jobId: string, targetId?: string): ApprovalResult {
  const job = getJob(jobId);
  if (!job) {
    return { success: false, error: `Job not found: ${jobId}` };
  }

  const workspaceId = normalizeWorkspaceId(job.workspaceId);
  const policy = getWorkspacePolicy(workspaceId);

  if (policy.autoApproveArtifacts) {
    maybeAutoApproveJob(job);
  }

  if (policy.requireReviewBeforePublish && job.lifecycleState !== 'approved') {
    return { success: false, error: `Workspace policy requires review/approval before publish (${workspaceId}).` };
  }

  if (!policy.requireReviewBeforePublish && !policy.allowDirectPublish && job.lifecycleState !== 'approved') {
    return { success: false, error: `Workspace policy does not allow direct publish (${workspaceId}).` };
  }

  if (job.lifecycleState !== 'approved' && !policy.allowDirectPublish) {
    return { success: false, error: 'Only approved jobs can be published.' };
  }

  job.lifecycleState = 'published';
  job.updatedAt = Date.now();
  syncArtifactsForJob(jobId, 'published');

  if (targetId) {
    const artifacts = runtimeStore.artifacts.filter((artifact) => artifact.jobId === jobId);
    for (const artifact of artifacts) {
      const result = publishArtifact(artifact.id, targetId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }
  }

  logEvent({
    type: 'job_published',
    entityType: 'job',
    entityId: job.id,
    message: `Job ${job.id} published${targetId ? ` to ${targetId}` : ''}`,
    metadata: { workspaceId, ...(targetId ? { targetId } : {}) },
  });
  saveRuntimeState();

  return { success: true, job };
}
