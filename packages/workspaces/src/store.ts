import type { Workspace } from './types';

class WorkspaceStore {
  private readonly workspaces = new Map<string, Workspace>();

  create(workspace: Workspace): Workspace {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  getById(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  listAll(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  listActive(): Workspace[] {
    return Array.from(this.workspaces.values()).filter(
      (w) => w.status === 'active',
    );
  }

  update(id: string, updates: Partial<Pick<Workspace, 'name' | 'description' | 'status' | 'blueprintIds' | 'agentIds' | 'policyIds'>>): Workspace | undefined {
    const ws = this.workspaces.get(id);
    if (!ws) return undefined;
    Object.assign(ws, updates);
    ws.updatedAt = Date.now();
    return ws;
  }

  reset(): void {
    this.workspaces.clear();
  }
}

export const workspaceStore = new WorkspaceStore();

// Seed the default workspace.
workspaceStore.create({
  id: 'default',
  name: 'Default Workspace',
  description: 'Primary GhostClaw workspace for V1 runtime proof.',
  status: 'active',
  blueprintIds: ['bp_contractor_website_factory'],
  agentIds: ['SiteArchitectAgent', 'PageContentAgent', 'QAReviewAgent'],
  policyIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
