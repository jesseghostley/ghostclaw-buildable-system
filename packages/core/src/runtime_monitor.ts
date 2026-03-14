import { agentRegistry } from './agent_registry';
import { listEvents } from './event_log';
import { jobQueue } from './job_queue';
import { listPublishTargets, listPublishedOutputs } from './publisher';
import { skillRegistry } from './skill_registry';
import { runtimeStore } from './state_store';
import { getWorkflowStatus } from './workflow_orchestrator';

function getJobCounts() {
  const jobs = jobQueue.list();

  return {
    totalJobs: jobs.length,
    queuedJobs: jobs.filter((job) => job.status === 'queued').length,
    runningJobs: jobs.filter((job) => job.status === 'running').length,
    completedJobs: jobs.filter((job) => job.status === 'completed').length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
  };
}

function getBlockedJobReasonsSummary() {
  const summary: Record<string, number> = {};

  jobQueue.list().forEach((job) => {
    if (job.status === 'blocked') {
      const reason = job.blockedReason ?? 'unknown';
      summary[reason] = (summary[reason] ?? 0) + 1;
    }
  });

  return summary;
}

function getWorkflowIds(): string[] {
  return Array.from(new Set(runtimeStore.jobs.map((job) => job.workflowId).filter(Boolean))) as string[];
}

function getWorkflowStatusSummary() {
  return getWorkflowIds().map((workflowId) => getWorkflowStatus(workflowId));
}

function getBlockedDependencySummary() {
  const blocked = jobQueue
    .list()
    .filter((job) => job.status === 'blocked' && (job.blockedReason === 'dependency_incomplete' || job.blockedReason === 'dependency_failed'));

  return {
    dependency_incomplete: blocked.filter((job) => job.blockedReason === 'dependency_incomplete').length,
    dependency_failed: blocked.filter((job) => job.blockedReason === 'dependency_failed').length,
  };
}

function getRecentEvents(limit = 25) {
  return [...listEvents()].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export function getRuntimeStatus() {
  const queueCounts = getJobCounts();

  return {
    totalSignals: runtimeStore.signals.length,
    totalPlans: runtimeStore.plans.length,
    ...queueCounts,
    totalArtifacts: runtimeStore.artifacts.length,
    registeredAgents: agentRegistry.listAgents().length,
    registeredSkills: skillRegistry.listSkills().length,
    workflowCount: getWorkflowIds().length,
    blockedJobReasons: getBlockedJobReasonsSummary(),
    blockedDependencySummary: getBlockedDependencySummary(),
    totalEventCount: runtimeStore.events.length,
    recentEvents: getRecentEvents(10),
    publishTargetCount: listPublishTargets().length,
    publishedOutputCount: runtimeStore.publishedOutputs.length,
  };
}

export function getQueueStatus() {
  const queueCounts = getJobCounts();

  return {
    ...queueCounts,
    blockedJobReasons: getBlockedJobReasonsSummary(),
    blockedDependencySummary: getBlockedDependencySummary(),
    jobs: jobQueue.list(),
  };
}

export function getWorkflowStatuses() {
  return {
    workflowCount: getWorkflowIds().length,
    workflows: getWorkflowStatusSummary(),
  };
}

export function getEventStatus() {
  return {
    totalEventCount: runtimeStore.events.length,
    events: getRecentEvents(100),
  };
}

export function getAgentStatus() {
  const agents = agentRegistry.listAgents();

  return {
    registeredAgents: agents.length,
    agentCapabilityMap: Object.fromEntries(
      agents.map((agent) => [agent.name, agent.capabilities]),
    ),
    agents,
  };
}

export function getSkillStatus() {
  const skills = skillRegistry.listSkills();
  return {
    registeredSkills: skills.length,
    skills,
  };
}


export function getPublishStatus() {
  return {
    targets: listPublishTargets(),
    publishedOutputCount: runtimeStore.publishedOutputs.length,
    outputs: listPublishedOutputs(),
  };
}

export function getArtifactStatus() {
  return {
    totalArtifacts: runtimeStore.artifacts.length,
    artifacts: runtimeStore.artifacts,
  };
}
