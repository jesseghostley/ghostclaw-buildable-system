import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
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

export function getRuntimeStatus() {
  const queueCounts = getJobCounts();

  return {
    totalSignals: runtimeStore.signals.length,
    totalPlans: runtimeStore.plans.length,
    ...queueCounts,
    totalArtifacts: runtimeStore.artifacts.length,
    registeredAgents: agentRegistry.listAgents().length,
  };
}

export function getQueueStatus() {
  const queueCounts = getJobCounts();

  return {
    ...queueCounts,
    jobs: jobQueue.list(),
  };
}

export function getAgentStatus() {
  const agents = agentRegistry.listAgents();

  return {
    registeredAgents: agents.length,
    agentCapabilityMap: Object.fromEntries(
      agents.map((agent) => [agent.agentName, agent.capabilities]),
    ),
    agents,
  };
}

export function getArtifactStatus() {
  return {
    totalArtifacts: runtimeStore.artifacts.length,
    artifacts: runtimeStore.artifacts,
  };
}
