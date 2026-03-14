import { agentRegistry } from './agent_registry';
import { logEvent } from './event_log';
import { jobQueue } from './job_queue';
import { skillRegistry } from './skill_registry';
import { unblockDependentJobs } from './workflow_orchestrator';
import type { Artifact } from './runtime_loop';

export type JobHandler = (inputPayload: Record<string, unknown>) => Record<string, unknown>;

const JOB_HANDLERS: Record<string, JobHandler> = {
  research_keyword_cluster: (inputPayload) => ({
    result: `Keyword cluster researched for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  draft_cluster_outline: (inputPayload) => ({
    result: `Cluster outline generated for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  write_article: (inputPayload) => ({
    result: `Article drafted for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  write_service_page: (inputPayload) => ({
    result: `Service page drafted for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  generate_metadata: (inputPayload) => ({
    result: `Metadata generated for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  generate_schema: (inputPayload) => ({
    result: `Schema generated for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
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
      unblockDependentJobs(job.id);

      const artifact = {
        id: `artifact_${job.id}`,
        jobId: job.id,
        workspaceId: job.workspaceId ?? 'ghostclaw_core',
        type: job.jobType,
        title: `${job.jobType} output`,
        content: JSON.stringify(
          {
            skillId: skill.id,
            agentId: assignedAgent.id,
            agentName: assignedAgent.name,
            workflowId: job.workflowId,
            result: outputPayload,
            workspaceId: job.workspaceId,
          },
          null,
          2,
        ),
        status: 'draft' as const,
        createdAt: Date.now(),
      };
      artifacts.push(artifact);
      logEvent({
        type: 'artifact_created',
        entityType: 'artifact',
        entityId: artifact.id,
        message: `Artifact ${artifact.id} created for job ${job.id}`,
        metadata: { jobId: job.id, workflowId: job.workflowId, workspaceId: job.workspaceId },
      });
    } catch {
      jobQueue.markFailed(job.id);
      unblockDependentJobs(job.id);
    }
  }

  return artifacts;
}
