export type WorkspaceStatus = 'active' | 'archived' | 'suspended';

export type Workspace = {
  id: string;
  name: string;
  description: string;
  status: WorkspaceStatus;
  blueprintIds: string[];
  agentIds: string[];
  policyIds: string[];
  createdAt: number;
  updatedAt: number;
};
