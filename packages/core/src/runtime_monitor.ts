import { agentRegistry } from './agent_registry';
import { listEvents } from './event_log';
import { jobQueue } from './job_queue';
import { listPublishTargets, listPublishedOutputs } from './publisher';
import { skillRegistry } from './skill_registry';
import { runtimeStore } from './state_store';
import { getWorkflowStatus } from './workflow_orchestrator';
import { getWorkspacePolicy, listWorkspacePolicies, listWorkspaces, normalizeWorkspaceId } from './workspace_registry';

function matchesWorkspace<T extends { workspaceId?: string }>(item: T, workspaceId?: string): boolean {
  if (!workspaceId) {
    return true;
  }

  return normalizeWorkspaceId(item.workspaceId) === normalizeWorkspaceId(workspaceId);
}

function getJobCounts(workspaceId?: string) {
  const jobs = jobQueue.list().filter((job) => matchesWorkspace(job, workspaceId));

  return {
    totalJobs: jobs.length,
    queuedJobs: jobs.filter((job) => job.status === 'queued').length,
    runningJobs: jobs.filter((job) => job.status === 'running').length,
    completedJobs: jobs.filter((job) => job.status === 'completed').length,
    failedJobs: jobs.filter((job) => job.status === 'failed').length,
  };
}

function getBlockedJobReasonsSummary(workspaceId?: string) {
  const summary: Record<string, number> = {};

  jobQueue
    .list()
    .filter((job) => matchesWorkspace(job, workspaceId))
    .forEach((job) => {
      if (job.status === 'blocked') {
        const reason = job.blockedReason ?? 'unknown';
        summary[reason] = (summary[reason] ?? 0) + 1;
      }
    });

  return summary;
}

function getWorkflowIds(workspaceId?: string): string[] {
  return Array.from(
    new Set(
      runtimeStore.jobs
        .filter((job) => matchesWorkspace(job, workspaceId))
        .map((job) => job.workflowId)
        .filter(Boolean),
    ),
  ) as string[];
}

function getWorkflowStatusSummary(workspaceId?: string) {
  return getWorkflowIds(workspaceId).map((workflowId) => getWorkflowStatus(workflowId, workspaceId));
}

function getBlockedDependencySummary(workspaceId?: string) {
  const blocked = jobQueue
    .list()
    .filter(
      (job) =>
        matchesWorkspace(job, workspaceId)
        && job.status === 'blocked'
        && (job.blockedReason === 'dependency_incomplete' || job.blockedReason === 'dependency_failed'),
    );

  return {
    dependency_incomplete: blocked.filter((job) => job.blockedReason === 'dependency_incomplete').length,
    dependency_failed: blocked.filter((job) => job.blockedReason === 'dependency_failed').length,
  };
}

function getRecentEvents(limit = 25, workspaceId?: string) {
  return [...listEvents()]
    .filter((event) => matchesWorkspace({ workspaceId: event.metadata?.workspaceId as string | undefined }, workspaceId))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getRuntimeStatus(workspaceId?: string) {
  const queueCounts = getJobCounts(workspaceId);

  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    availableWorkspaces: listWorkspaces(),
    selectedWorkspacePolicy: workspaceId ? getWorkspacePolicy(workspaceId) : undefined,
    totalSignals: runtimeStore.signals.filter((signal) => matchesWorkspace(signal, workspaceId)).length,
    totalPlans: runtimeStore.plans.filter((plan) => matchesWorkspace(plan, workspaceId)).length,
    ...queueCounts,
    totalArtifacts: runtimeStore.artifacts.filter((artifact) => matchesWorkspace(artifact, workspaceId)).length,
    registeredAgents: agentRegistry.listAgents().length,
    registeredSkills: skillRegistry.listSkills().length,
    workflowCount: getWorkflowIds(workspaceId).length,
    blockedJobReasons: getBlockedJobReasonsSummary(workspaceId),
    blockedDependencySummary: getBlockedDependencySummary(workspaceId),
    totalEventCount: getRecentEvents(100000, workspaceId).length,
    recentEvents: getRecentEvents(10, workspaceId),
    publishTargetCount: listPublishTargets().length,
    publishedOutputCount: listPublishedOutputs(workspaceId).length,
  };
}

export function getQueueStatus(workspaceId?: string) {
  const queueCounts = getJobCounts(workspaceId);

  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    ...queueCounts,
    blockedJobReasons: getBlockedJobReasonsSummary(workspaceId),
    blockedDependencySummary: getBlockedDependencySummary(workspaceId),
    jobs: jobQueue.list().filter((job) => matchesWorkspace(job, workspaceId)),
  };
}

export function getWorkflowStatuses(workspaceId?: string) {
  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    workflowCount: getWorkflowIds(workspaceId).length,
    workflows: getWorkflowStatusSummary(workspaceId),
  };
}

export function getEventStatus(workspaceId?: string) {
  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    totalEventCount: getRecentEvents(100000, workspaceId).length,
    events: getRecentEvents(100, workspaceId),
  };
}

export function getAgentStatus() {
  const agents = agentRegistry.listAgents();

  return {
    registeredAgents: agents.length,
    agentCapabilityMap: Object.fromEntries(agents.map((agent) => [agent.name, agent.capabilities])),
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

export function getPublishStatus(workspaceId?: string) {
  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    targets: listPublishTargets(),
    publishedOutputCount: listPublishedOutputs(workspaceId).length,
    outputs: listPublishedOutputs(workspaceId),
  };
}

export function getArtifactStatus(workspaceId?: string) {
  return {
    workspaceId: workspaceId ? normalizeWorkspaceId(workspaceId) : undefined,
    totalArtifacts: runtimeStore.artifacts.filter((artifact) => matchesWorkspace(artifact, workspaceId)).length,
    artifacts: runtimeStore.artifacts.filter((artifact) => matchesWorkspace(artifact, workspaceId)),
  };
}

export function getWorkspaceStatus(workspaceId?: string) {
  const normalizedWorkspaceId = workspaceId ? normalizeWorkspaceId(workspaceId) : undefined;
  return {
    defaultWorkspaceId: normalizeWorkspaceId(undefined),
    selectedWorkspaceId: normalizedWorkspaceId,
    selectedWorkspacePolicy: normalizedWorkspaceId ? getWorkspacePolicy(normalizedWorkspaceId) : undefined,
    workspacePolicies: listWorkspacePolicies(),
    workspaces: listWorkspaces().map((workspace) => ({
      ...workspace,
      policy: getWorkspacePolicy(workspace.id),
    })),
  };
}
