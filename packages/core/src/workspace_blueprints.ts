import type { WorkspaceBlueprint } from '../../shared/src/types/workspace_blueprint';
import { initializeWorkspace } from './workspace_initializer';
import { createWorkspaceWithPolicy, getWorkspace, getWorkspacePolicy } from './workspace_registry';

const BLUEPRINTS: WorkspaceBlueprint[] = [
  {
    id: 'ai_seo_agency',
    name: 'AI SEO Agency',
    category: 'agency',
    description: 'Blueprint for a multi-client AI SEO operations company.',
    defaultPolicy: {
      requireReviewBeforePublish: true,
      allowedPublishTargets: ['local_files', 'website_drafts', 'docs_exports'],
      allowDirectPublish: false,
      autoApproveArtifacts: false,
      status: 'active',
    },
    defaultPublishTargets: ['local_files', 'website_drafts', 'docs_exports'],
    defaultJobTypes: ['research_keyword_cluster', 'write_article', 'generate_metadata', 'generate_schema'],
    status: 'active',
  },
  {
    id: 'contractor_marketing_engine',
    name: 'Contractor Marketing Engine',
    category: 'company',
    description: 'Blueprint for local contractor marketing workflow automation.',
    defaultPolicy: {
      requireReviewBeforePublish: true,
      allowedPublishTargets: ['local_files', 'website_drafts'],
      allowDirectPublish: false,
      autoApproveArtifacts: false,
      status: 'active',
    },
    defaultPublishTargets: ['local_files', 'website_drafts'],
    defaultJobTypes: ['write_service_page', 'generate_metadata', 'generate_schema'],
    status: 'active',
  },
  {
    id: 'ghost_mart_store',
    name: 'Ghost Mart Store',
    category: 'marketplace',
    description: 'Blueprint for storefront and marketplace listing operations.',
    defaultPolicy: {
      requireReviewBeforePublish: true,
      allowedPublishTargets: ['local_files', 'ghost_mart_drafts'],
      allowDirectPublish: false,
      autoApproveArtifacts: false,
      status: 'active',
    },
    defaultPublishTargets: ['local_files', 'ghost_mart_drafts'],
    defaultJobTypes: ['write_article', 'generate_metadata'],
    status: 'active',
  },
  {
    id: 'docs_factory',
    name: 'Docs Factory',
    category: 'documentation',
    description: 'Blueprint for documentation generation and export pipeline.',
    defaultPolicy: {
      requireReviewBeforePublish: true,
      allowedPublishTargets: ['local_files', 'docs_exports'],
      allowDirectPublish: false,
      autoApproveArtifacts: false,
      status: 'active',
    },
    defaultPublishTargets: ['local_files', 'docs_exports'],
    defaultJobTypes: ['write_article', 'scaffold_skill_package'],
    status: 'active',
  },
];

function slugifyWorkspaceId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'workspace';
}

export function listBlueprints(): WorkspaceBlueprint[] {
  return BLUEPRINTS;
}

export function getBlueprint(id: string): WorkspaceBlueprint | undefined {
  return BLUEPRINTS.find((blueprint) => blueprint.id === id && blueprint.status === 'active');
}

export function createWorkspaceFromBlueprint(
  blueprintId: string,
  workspaceName: string,
  workspaceId?: string,
  initialize = false,
  kickoff = false,
) {
  const blueprint = getBlueprint(blueprintId);
  if (!blueprint) {
    return { success: false as const, error: `Blueprint not found: ${blueprintId}` };
  }

  if (!workspaceName || !workspaceName.trim()) {
    return { success: false as const, error: 'workspaceName is required.' };
  }

  const resolvedWorkspaceId = (workspaceId && workspaceId.trim()) ? slugifyWorkspaceId(workspaceId) : slugifyWorkspaceId(workspaceName);

  if (getWorkspace(resolvedWorkspaceId)) {
    return { success: false as const, error: `Workspace already exists: ${resolvedWorkspaceId}` };
  }

  const workspace = createWorkspaceWithPolicy(
    {
      id: resolvedWorkspaceId,
      name: workspaceName.trim(),
      category: blueprint.category,
      status: 'active',
      description: blueprint.description,
    },
    {
      workspaceId: resolvedWorkspaceId,
      ...blueprint.defaultPolicy,
      allowedPublishTargets: blueprint.defaultPublishTargets,
    },
  );

  const initializer = initialize
    ? initializeWorkspace(resolvedWorkspaceId, blueprint.id, { kickoff })
    : undefined;
  if (initializer && !initializer.success) {
    return initializer;
  }

  return {
    success: true as const,
    workspace,
    policy: getWorkspacePolicy(resolvedWorkspaceId),
    blueprint,
    starterPackSummary: initializer?.starterPackSummary,
    kickoffSummary: initializer?.kickoffSummary ?? { kickedOff: false },
  };
}
