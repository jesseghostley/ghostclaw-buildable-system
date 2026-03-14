import type { DependencyBlockedReason, JobDependencyMeta } from '../../shared/src/types/job';
import { logEvent } from './event_log';
import { normalizeWorkspaceId } from './workspace_registry';

export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked';

export type ReviewState = 'draft' | 'waiting_review' | 'approved' | 'rejected' | 'published';

export type QueueJob = JobDependencyMeta & {
  id: string;
  workspaceId?: string;
  planId: string;
  jobType: string;
  assignedAgent: string | null;
  status: JobStatus;
  lifecycleState: ReviewState;
  reviewReason?: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
};

export type PersistedQueueState = {
  queue: string[];
  executing: string[];
};

const MAX_RETRIES = 2;

class InMemoryJobQueue {
  private readonly jobsById = new Map<string, QueueJob>();
  private readonly queue: string[] = [];
  private readonly executing = new Set<string>();

  enqueue(job: QueueJob): QueueJob {
    const existing = this.jobsById.get(job.id);
    if (existing) {
      return existing;
    }

    this.jobsById.set(job.id, job);
    if (job.status === 'queued') {
      this.queue.push(job.id);
    }

    logEvent({
      type: 'job_queued',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} queued (${job.jobType})`,
      metadata: { workflowId: job.workflowId, dependencyJobIds: job.dependencyJobIds ?? [], workspaceId: job.workspaceId },
    });

    return job;
  }

  get(jobId: string): QueueJob | undefined {
    return this.jobsById.get(jobId);
  }

  private dependenciesAllowDequeue(job: QueueJob): boolean {
    if (!job.dependencyJobIds || job.dependencyJobIds.length === 0) {
      return true;
    }

    return job.blockedReason !== 'dependency_incomplete' && job.blockedReason !== 'dependency_failed';
  }

  dequeue(): QueueJob | undefined {
    while (this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        continue;
      }

      const job = this.jobsById.get(jobId);
      if (!job) {
        continue;
      }

      if (job.status !== 'queued') {
        continue;
      }

      if (!this.dependenciesAllowDequeue(job)) {
        continue;
      }

      if (this.executing.has(job.id)) {
        continue;
      }

      job.status = 'assigned';
      job.workflowState = 'running';
      job.updatedAt = Date.now();
      return job;
    }

    return undefined;
  }

  list(): QueueJob[] {
    return Array.from(this.jobsById.values());
  }

  markRunning(jobId: string): void {
    const job = this.jobsById.get(jobId);
    if (!job || this.executing.has(jobId) || job.status === 'completed') {
      return;
    }

    job.status = 'running';
    job.blockedReason = undefined;
    job.workflowState = 'running';
    job.updatedAt = Date.now();
    this.executing.add(jobId);

    logEvent({
      type: 'job_started',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} started`,
      metadata: { jobType: job.jobType, workflowId: job.workflowId, workspaceId: job.workspaceId },
    });
  }

  markComplete(jobId: string): void {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'completed';
    job.blockedReason = undefined;
    job.workflowState = 'completed';
    job.updatedAt = Date.now();
    this.executing.delete(jobId);

    logEvent({
      type: 'job_completed',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} completed`,
      metadata: { workflowId: job.workflowId, workspaceId: job.workspaceId },
    });
  }

  markBlocked(jobId: string, reason: DependencyBlockedReason = 'missing_agent'): void {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'blocked';
    job.blockedReason = reason;
    job.workflowState = 'blocked';
    job.updatedAt = Date.now();
    this.executing.delete(jobId);

    logEvent({
      type: 'job_blocked',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} blocked (${reason})`,
      metadata: { workflowId: job.workflowId, reason, workspaceId: job.workspaceId },
    });
  }

  markFailed(jobId: string): void {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return;
    }

    this.executing.delete(jobId);
    job.retryCount += 1;
    job.updatedAt = Date.now();

    if (job.retryCount <= MAX_RETRIES) {
      job.status = 'queued';
      job.workflowState = 'ready';
      job.blockedReason = undefined;
      if (!this.queue.includes(job.id)) {
        this.queue.push(job.id);
      }
      logEvent({
        type: 'job_failed',
        entityType: 'job',
        entityId: job.id,
        message: `Job ${job.id} failed and requeued for retry`,
        metadata: { retryCount: job.retryCount, workspaceId: job.workspaceId },
      });
      return;
    }

    job.status = 'failed';
    job.workflowState = 'failed';
    logEvent({
      type: 'job_failed',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} failed permanently`,
      metadata: { retryCount: job.retryCount, workspaceId: job.workspaceId },
    });
  }

  requeue(jobId: string): QueueJob | undefined {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return undefined;
    }

    this.executing.delete(jobId);
    job.status = 'queued';
    job.blockedReason = undefined;
    job.workflowState = 'ready';
    job.updatedAt = Date.now();

    if (!this.queue.includes(job.id)) {
      this.queue.push(job.id);
    }

    logEvent({
      type: 'job_unblocked',
      entityType: 'job',
      entityId: job.id,
      message: `Job ${job.id} unblocked/requeued`,
      metadata: { workflowId: job.workflowId, workspaceId: job.workspaceId },
    });

    return job;
  }

  getState(): PersistedQueueState {
    return {
      queue: [...this.queue],
      executing: Array.from(this.executing.values()),
    };
  }

  restore(jobs: QueueJob[], state: PersistedQueueState): void {
    this.reset();

    jobs.forEach((job) => {
      const normalized = {
        ...job,
        lifecycleState: job.lifecycleState ?? 'draft',
        workflowState: job.workflowState ?? 'draft',
        blockedReason: job.blockedReason,
        workspaceId: normalizeWorkspaceId(job.workspaceId),
      };
      this.jobsById.set(job.id, normalized);
    });

    this.queue.push(
      ...state.queue.filter((jobId) => {
        const job = this.jobsById.get(jobId);
        return Boolean(job) && job?.status === 'queued';
      }),
    );

    state.executing.forEach((jobId) => {
      if (this.jobsById.has(jobId)) {
        this.executing.add(jobId);
      }
    });
  }

  reset(): void {
    this.jobsById.clear();
    this.queue.length = 0;
    this.executing.clear();
  }
}

export const jobQueue = new InMemoryJobQueue();
