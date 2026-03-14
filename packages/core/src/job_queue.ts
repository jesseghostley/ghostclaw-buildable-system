export type JobStatus = 'queued' | 'assigned' | 'running' | 'completed' | 'failed';

export type QueueJob = {
  id: string;
  planId: string;
  jobType: string;
  assignedAgent: string | null;
  status: JobStatus;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
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

    return job;
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

      if (this.executing.has(job.id)) {
        continue;
      }

      job.status = 'assigned';
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
    job.updatedAt = Date.now();
    this.executing.add(jobId);
  }

  markComplete(jobId: string): void {
    const job = this.jobsById.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'completed';
    job.updatedAt = Date.now();
    this.executing.delete(jobId);
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
      this.queue.push(job.id);
      return;
    }

    job.status = 'failed';
  }
}

export const jobQueue = new InMemoryJobQueue();
