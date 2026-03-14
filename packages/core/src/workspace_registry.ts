import type { WorkspacePolicy } from '../../shared/src/types/workspace_policy';
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

const DEFAULT_WORKSPACE_POLICIES: WorkspacePolicy[] = [
  {
    workspaceId: 'ghostclaw_core',
    requireReviewBeforePublish: true,
    allowedPublishTargets: ['local_files', 'docs_exports'],
    allowDirectPublish: false,
    autoApproveArtifacts: false,
    status: 'active',
  },
  {
    workspaceId: 'agile_contractor_marketing',
    requireReviewBeforePublish: true,
    allowedPublishTargets: ['local_files', 'website_drafts'],
    allowDirectPublish: false,
    autoApproveArtifacts: false,
    status: 'active',
  },
  {
    workspaceId: 'ghost_mart',
    requireReviewBeforePublish: true,
    allowedPublishTargets: ['local_files', 'ghost_mart_drafts'],
    allowDirectPublish: false,
    autoApproveArtifacts: false,
    status: 'active',
  },
  {
    workspaceId: 'ai_seo_agency',
    requireReviewBeforePublish: true,
    allowedPublishTargets: ['local_files', 'website_drafts', 'docs_exports'],
    allowDirectPublish: false,
    autoApproveArtifacts: false,
    status: 'active',
  },
];

const workspaces = new Map<string, Workspace>(DEFAULT_WORKSPACES.map((workspace) => [workspace.id, workspace]));
const policies = new Map<string, WorkspacePolicy>(DEFAULT_WORKSPACE_POLICIES.map((policy) => [policy.workspaceId, policy]));

export const DEFAULT_WORKSPACE_ID = 'ghostclaw_core';

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

export function normalizeWorkspaceId(workspaceId?: string): string {
  if (!workspaceId || !workspaces.has(workspaceId)) {
    return DEFAULT_WORKSPACE_ID;
  }

  return workspaceId;
}

export function listWorkspacePolicies(): WorkspacePolicy[] {
  return Array.from(policies.values());
}

export function getWorkspacePolicy(workspaceId?: string): WorkspacePolicy {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  return policies.get(normalizedWorkspaceId) ?? policies.get(DEFAULT_WORKSPACE_ID) ?? DEFAULT_WORKSPACE_POLICIES[0];
}
