import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import type { Artifact } from './runtime_loop';

export type JobHandler = (inputPayload: Record<string, unknown>) => Record<string, unknown>;

const JOB_HANDLERS: Record<string, JobHandler> = {
  draft_cluster_outline: (inputPayload) => ({
    result: `Cluster outline generated for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  refresh_page_sections: (inputPayload) => ({
    result: `Page sections refreshed for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  scaffold_skill_package: (inputPayload) => ({
    result: `Skill package scaffolded for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
};

export function executeJobs(): Artifact[] {
  const artifacts: Artifact[] = [];

  while (true) {
    const job = jobQueue.dequeue();
    if (!job) {
      break;
    }

    const assignedAgent = agentRegistry.findAgentForJob(job.jobType);
    if (!assignedAgent) {
      jobQueue.markFailed(job.id);
      continue;
    }

    job.assignedAgent = assignedAgent.agentName;
    job.updatedAt = Date.now();
    jobQueue.markRunning(job.id);

    const handler = JOB_HANDLERS[job.jobType];
    if (!handler) {
      jobQueue.markFailed(job.id);
      continue;
    }

    try {
      const outputPayload = handler(job.inputPayload);
      job.outputPayload = outputPayload;
      job.updatedAt = Date.now();
      jobQueue.markComplete(job.id);

      artifacts.push({
        id: `artifact_${job.id}`,
        jobId: job.id,
        type: job.jobType,
        content: `${assignedAgent.agentName} executed ${job.jobType}`,
        createdAt: Date.now(),
      });
    } catch {
      jobQueue.markFailed(job.id);
    }
  }

  return artifacts;
}
