import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { listPlannerStrategies } from './planner_registry';
import { runtimeStore } from './runtime_loop';
import { skillInvocationStore, type SkillInvocation, type SkillInvocationStatus } from './skill_invocation';
import type { RuntimeContext } from './runtime_context';

function getJobCounts(ctx?: RuntimeContext) {
  const jobStore = ctx?.stores.jobStore ?? jobQueue;
  const jobs = jobStore.list();

  return {
    totalJobs: jobs.length,
    queuedJobs: jobs.filter((job) => job.status === 'queued').length,
    runningJobs: jobs.filter((job) => job.status === 'running').length,
    completedJobs: jobs.filter((job) => job.status === 'completed').length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
  };
}

function countInvocationsByStatus(invocations: SkillInvocation[]): Record<SkillInvocationStatus, number> {
  return invocations.reduce(
    (acc, inv) => {
      acc[inv.status] += 1;
      return acc;
    },
    { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 } as Record<SkillInvocationStatus, number>,
  );
}

export function getRuntimeStatus(ctx?: RuntimeContext) {
  const queueCounts = getJobCounts(ctx);
  const siStore = ctx?.stores.skillInvocationStore ?? skillInvocationStore;
  const invocations = siStore.listAll();

  const totalSignals = ctx
    ? ctx.stores.signalStore.listAll().length
    : runtimeStore.signals.length;
  const totalPlans = ctx
    ? ctx.stores.planStore.listAll().length
    : runtimeStore.plans.length;
  const totalArtifacts = ctx
    ? ctx.stores.artifactStore.listAll().length
    : runtimeStore.artifacts.length;

  return {
    totalSignals,
    totalPlans,
    ...queueCounts,
    totalArtifacts,
    registeredAgents: agentRegistry.listAgents().length,
    totalSkillInvocations: invocations.length,
    skillInvocationsByStatus: countInvocationsByStatus(invocations),
  };
}

export function getQueueStatus(ctx?: RuntimeContext) {
  const jobStore = ctx?.stores.jobStore ?? jobQueue;
  const queueCounts = getJobCounts(ctx);

  return {
    ...queueCounts,
    jobs: jobStore.list(),
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

export function getPlannerStrategyStatus(ctx?: RuntimeContext) {
  const strategies = listPlannerStrategies();
  const plans = ctx
    ? ctx.stores.planStore.listAll()
    : runtimeStore.plans;
  const recentPlans = plans.slice(-10);

  const strategyUsage: Record<string, number> = {};
  for (const plan of plans) {
    strategyUsage[plan.strategyId] = (strategyUsage[plan.strategyId] ?? 0) + 1;
  }

  return {
    strategyCount: strategies.length,
    plannerStrategies: strategies,
    plannerStrategySummary: strategies.map((s) => ({
      id: s.id,
      name: s.name,
      strategyType: s.strategyType,
      status: s.status,
      supportedSignals: s.supportedSignals,
      plansResolved: strategyUsage[s.id] ?? 0,
    })),
    recentPlanStrategyUsage: recentPlans.map((p) => ({
      planId: p.id,
      strategyId: p.strategyId,
      strategyType: p.strategyType,
    })),
  };
}

export function getArtifactStatus(ctx?: RuntimeContext) {
  const artifacts = ctx
    ? ctx.stores.artifactStore.listAll()
    : runtimeStore.artifacts;

  return {
    totalArtifacts: artifacts.length,
    artifacts,
  };
}

export function getSkillInvocationStatus(ctx?: RuntimeContext) {
  const siStore = ctx?.stores.skillInvocationStore ?? skillInvocationStore;
  const invocations = siStore.listAll();

  return {
    totalInvocations: invocations.length,
    byStatus: countInvocationsByStatus(invocations),
    invocations,
  };
}
