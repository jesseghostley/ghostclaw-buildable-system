export type JobWorkflowState =
  | 'draft'
  | 'blocked'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed';

export type DependencyBlockedReason =
  | 'missing_skill'
  | 'missing_agent'
  | 'missing_handler'
  | 'dependency_incomplete'
  | 'dependency_failed';

export type JobDependencyMeta = {
  workspaceId?: string;
  parentJobId?: string;
  dependencyJobIds?: string[];
  workflowId?: string;
  blockedReason?: DependencyBlockedReason;
  workflowState?: JobWorkflowState;
};
