export type WorkspaceStatus = 'active' | 'inactive';

export type Workspace = {
  id: string;
  name: string;
  category: string;
  status: WorkspaceStatus;
  description: string;
};
