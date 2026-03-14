import type { WorkspacePolicy } from './workspace_policy';

export type WorkspaceBlueprintStatus = 'active' | 'inactive';

export type WorkspaceBlueprint = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultPolicy: Omit<WorkspacePolicy, 'workspaceId'>;
  defaultPublishTargets: string[];
  defaultJobTypes: string[];
  status: WorkspaceBlueprintStatus;
};
