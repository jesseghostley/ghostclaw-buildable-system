import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillRegistry } from './skill_registry';
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

    const requiredSkills = skillRegistry.findSkillsForJobType(job.jobType);
    if (requiredSkills.length === 0) {
      jobQueue.markBlocked(job.id, 'missing_skill');
      continue;
    }

    const skill = requiredSkills[0];
    const assignedAgent = agentRegistry.findAgentForJobAndSkill(job.jobType, skill.id);
    if (!assignedAgent) {
      jobQueue.markBlocked(job.id, 'missing_agent');
      continue;
    }

    job.assignedAgent = assignedAgent.name;
    job.updatedAt = Date.now();
    jobQueue.markRunning(job.id);

    const handler = JOB_HANDLERS[job.jobType];
    if (!handler) {
      jobQueue.markBlocked(job.id, 'missing_handler');
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
        title: `${job.jobType} output`,
        content: JSON.stringify(
          {
            skillId: skill.id,
            agentId: assignedAgent.id,
            agentName: assignedAgent.name,
            result: outputPayload,
          },
          null,
          2,
        ),
        status: 'draft',
        createdAt: Date.now(),
      });
    } catch {
      jobQueue.markFailed(job.id);
    }
  }

  return artifacts;
}
