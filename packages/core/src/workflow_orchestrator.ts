import type { JobDependencyMeta } from '../../shared/src/types/job';
import { jobQueue } from './job_queue';
import { runtimeStore } from './state_store';

export function createWorkflow(
  plan: { id: string; action: string },
  jobs: Array<{ id: string; dependencyJobIds?: string[] }>,
): string {
  const workflowId = `workflow_${plan.id}`;

  jobs.forEach((job) => {
    const dependencies = job.dependencyJobIds ?? [];
    const runtimeJob = runtimeStore.jobs.find((candidate) => candidate.id === job.id);
    if (!runtimeJob) {
      return;
    }

    runtimeJob.workflowId = workflowId;
    runtimeJob.dependencyJobIds = dependencies;
    runtimeJob.parentJobId = dependencies[0];

    if (dependencies.length > 0) {
      runtimeJob.status = 'blocked';
      runtimeJob.blockedReason = 'dependency_incomplete';
      runtimeJob.workflowState = 'blocked';
    } else {
      runtimeJob.workflowState = 'ready';
    }
  });

  return workflowId;
}

export function canRunJob(job: JobDependencyMeta & { id: string }): {
  runnable: boolean;
  reason?: 'dependency_incomplete' | 'dependency_failed';
} {
  const dependencies = job.dependencyJobIds ?? [];

  if (dependencies.length === 0) {
    return { runnable: true };
  }

  const dependencyJobs = runtimeStore.jobs.filter((candidate) => dependencies.includes(candidate.id));

  if (dependencyJobs.some((candidate) => candidate.status === 'failed')) {
    return { runnable: false, reason: 'dependency_failed' };
  }

  if (dependencyJobs.some((candidate) => candidate.status !== 'completed')) {
    return { runnable: false, reason: 'dependency_incomplete' };
  }

  return { runnable: true };
}

export function unblockDependentJobs(completedJobId: string): string[] {
  const unblocked: string[] = [];

  runtimeStore.jobs.forEach((job) => {
    if (!job.dependencyJobIds?.includes(completedJobId)) {
      return;
    }

    const eligibility = canRunJob(job);
    if (!eligibility.runnable) {
      job.status = 'blocked';
      job.blockedReason = eligibility.reason;
      job.workflowState = 'blocked';
      return;
    }

    if (job.status === 'blocked' || job.status === 'failed') {
      job.workflowState = 'ready';
      job.blockedReason = undefined;
      jobQueue.requeue(job.id);
      unblocked.push(job.id);
    }
  });

  return unblocked;
}

export function getWorkflowStatus(workflowId: string) {
  const jobs = runtimeStore.jobs.filter((job) => job.workflowId === workflowId);

  return {
    workflowId,
    totalJobs: jobs.length,
    completedJobs: jobs.filter((job) => job.status === 'completed').length,
    blockedJobs: jobs.filter((job) => job.status === 'blocked').length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
    runningJobs: jobs.filter((job) => job.status === 'running').length,
    jobs,
  };
}
