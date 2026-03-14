import type { Workspace } from '../../shared/src/types/workspace';

const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'ghostclaw_core',
    name: 'GhostClaw Core',
    category: 'platform',
    status: 'active',
    description: 'Default GhostClaw core workspace.',
  },
  {
    id: 'agile_contractor_marketing',
    name: 'Agile Contractor Marketing',
    category: 'company',
    status: 'active',
    description: 'Marketing workspace for agile contractor vertical.',
  },
  {
    id: 'ghost_mart',
    name: 'Ghost Mart',
    category: 'marketplace',
    status: 'active',
    description: 'Marketplace workspace for Ghost Mart operations.',
  },
  {
    id: 'ai_seo_agency',
    name: 'AI SEO Agency',
    category: 'agency',
    status: 'active',
    description: 'Agency operations workspace for AI SEO campaigns.',
  },
];

const workspaces = new Map<string, Workspace>(DEFAULT_WORKSPACES.map((workspace) => [workspace.id, workspace]));

export function listWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function createWorkspace(workspace: Workspace): Workspace {
  workspaces.set(workspace.id, workspace);
  return workspace;
}

export const DEFAULT_WORKSPACE_ID = 'ghostclaw_core';

export function normalizeWorkspaceId(workspaceId?: string): string {
  if (!workspaceId || !workspaces.has(workspaceId)) {
    return DEFAULT_WORKSPACE_ID;
  }

  return workspaceId;
}
