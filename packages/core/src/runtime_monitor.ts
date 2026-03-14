import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillRegistry } from './skill_registry';
import { runtimeStore } from './state_store';

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

export function getRuntimeStatus() {
  const queueCounts = getJobCounts();

  return {
    totalSignals: runtimeStore.signals.length,
    totalPlans: runtimeStore.plans.length,
    ...queueCounts,
    totalArtifacts: runtimeStore.artifacts.length,
    registeredAgents: agentRegistry.listAgents().length,
    registeredSkills: skillRegistry.listSkills().length,
    blockedJobReasons: getBlockedJobReasonsSummary(),
  };
}

export function getQueueStatus() {
  const queueCounts = getJobCounts();

  return {
    ...queueCounts,
    blockedJobReasons: getBlockedJobReasonsSummary(),
    jobs: jobQueue.list(),
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

export function getArtifactStatus() {
  return {
    totalArtifacts: runtimeStore.artifacts.length,
    artifacts: runtimeStore.artifacts,
  };
}
