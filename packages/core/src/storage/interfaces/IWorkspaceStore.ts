import type { Workspace, WorkspaceStatus } from '../../../../workspaces/src/types';

export interface IWorkspaceStore {
  create(workspace: Workspace): Workspace;
  getById(id: string): Workspace | undefined;
  listAll(): Workspace[];
  listActive(): Workspace[];
  update(id: string, updates: Partial<Pick<Workspace, 'name' | 'description' | 'status' | 'blueprintIds' | 'agentIds' | 'policyIds'>>): Workspace | undefined;
  reset(): void;
}
