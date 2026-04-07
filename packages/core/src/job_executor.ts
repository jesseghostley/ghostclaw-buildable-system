import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillInvocationStore } from './skill_invocation';
import { assignmentStore } from './assignment';
import { eventBus } from './event_bus';
import type { Artifact } from './runtime_loop';
import { getSkill } from './skills';
import type { RuntimeContext } from './runtime_context';
import type { QueueJob } from './job_queue';
import type { IJobStore } from './storage/interfaces/IJobStore';
import type { ISkillInvocationStore } from './storage/interfaces/ISkillInvocationStore';
import type { IAssignmentStore } from './storage/interfaces/IAssignmentStore';
import type { EventBus } from './event_bus';
import type { RuntimeEventMap } from './runtime_events';

export type { JobHandler } from './skills';

function _executeJob(
  job: QueueJob,
  jobStore: IJobStore,
  siStore: ISkillInvocationStore,
  aStore: IAssignmentStore,
  bus: EventBus<RuntimeEventMap>,
): Artifact | null {
  const assignedAgent = agentRegistry.findAgentForJob(job.jobType);
  if (!assignedAgent) {
    jobStore.markFailed(job.id);
    return null;
  }

  job.assignedAgent = assignedAgent.agentName;
  job.updatedAt = Date.now();
  jobStore.markRunning(job.id);

  bus.emit('job.assigned', { ...job, agentName: assignedAgent.agentName });

  const assignmentId = `assign_${job.id}`;
  aStore.create({
    id: assignmentId,
    jobId: job.id,
    agentName: assignedAgent.agentName,
    reason: `Agent selected by capability match for job type '${job.jobType}'.`,
    createdAt: Date.now(),
  });

  const skill = getSkill(job.jobType);
  if (!skill) {
    jobStore.markFailed(job.id);
    return null;
  }

  const invocationId = `inv_${job.id}`;

  const invocation = siStore.create({
    id: invocationId,
    workspaceId: 'default',
    planId: job.planId,
    jobId: job.id,
    assignmentId,
    agentId: assignedAgent.agentName,
    skillId: job.jobType,
    status: 'pending',
    inputPayload: job.inputPayload,
    outputPayload: null,
    artifactIds: [],
    error: null,
    retryCount: job.retryCount,
    fallbackUsed: false,
    startedAt: Date.now(),
    completedAt: null,
  });

  siStore.updateStatus(invocationId, 'running');
  bus.emit('skill.invocation.started', invocation);

  try {
    const outputPayload = skill.execute(job.inputPayload);
    job.outputPayload = outputPayload;
    job.updatedAt = Date.now();
    jobStore.markComplete(job.id);

    const artifactId = `artifact_${job.id}`;
    const completedAt = Date.now();

    siStore.updateStatus(invocationId, 'completed', {
      outputPayload,
      artifactIds: [artifactId],
      completedAt,
    });
    bus.emit('skill.invocation.completed', siStore.getById(invocationId)!);

    return {
      id: artifactId,
      jobId: job.id,
      skillInvocationId: invocationId,
      type: job.jobType,
      content: JSON.stringify(outputPayload),
      createdAt: completedAt,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[SkillInvocation] Invocation ${invocationId} failed for job ${job.id}:`, errorMessage);

    const retryCount = job.retryCount + 1;
    siStore.updateStatus(invocationId, 'failed', {
      error: errorMessage,
      retryCount,
      completedAt: Date.now(),
    });

    console.warn(`[SkillInvocation] Retry attempt ${retryCount} for job ${job.id} (skill: ${job.jobType})`);
    jobStore.markFailed(job.id);
    bus.emit('skill.invocation.failed', siStore.getById(invocationId)!);
    return null;
  }
}

/**
 * Execute a single pre-built job (must already be enqueued).
 * Returns the artifact produced, or null if execution failed.
 */
export function executeOneJob(jobId: string, ctx?: RuntimeContext): Artifact | null {
  const jobStore = ctx?.stores.jobStore ?? jobQueue;
  const siStore = ctx?.stores.skillInvocationStore ?? skillInvocationStore;
  const aStore = ctx?.stores.assignmentStore ?? assignmentStore;
  const bus = ctx?.eventBus ?? eventBus;

  const job = jobStore.dequeue();
  if (!job || job.id !== jobId) {
    return null;
  }
  return _executeJob(job, jobStore, siStore, aStore, bus);
}

/**
 * Drain the queue and execute all jobs. Used for single-step workflows
 * and backward compatibility.
 */
export function executeJobs(ctx?: RuntimeContext): Artifact[] {
  const jobStore = ctx?.stores.jobStore ?? jobQueue;
  const siStore = ctx?.stores.skillInvocationStore ?? skillInvocationStore;
  const aStore = ctx?.stores.assignmentStore ?? assignmentStore;
  const bus = ctx?.eventBus ?? eventBus;

  const artifacts: Artifact[] = [];

  while (true) {
    const job = jobStore.dequeue();
    if (!job) {
      break;
    }

    const artifact = _executeJob(job, jobStore, siStore, aStore, bus);
    if (artifact) {
      artifacts.push(artifact);
    }
  }

  return artifacts;
}
