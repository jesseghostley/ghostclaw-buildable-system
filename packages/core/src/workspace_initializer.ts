import type { Artifact, Signal } from './runtime_loop';
import { submitSignalToRuntime } from './runtime_loop';
import { logEvent } from './event_log';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore, seedStarterRecords } from './state_store';
import type { WorkspaceStarterPack } from '../../shared/src/types/workspace_starter_pack';
import { normalizeWorkspaceId } from './workspace_registry';

const STARTER_PACKS: WorkspaceStarterPack[] = [
  {
    blueprintId: 'ai_seo_agency',
    starterSignals: [{ name: 'keyword_opportunity_detected' }],
    starterArtifacts: [
      {
        type: 'workspace_overview',
        title: 'Workspace Overview',
        content: 'Starter note: focus first workflow on keyword cluster research and article generation.',
        status: 'draft',
      },
    ],
    starterWorkflowTemplates: [
      {
        name: 'recommended_first_workflow',
        jobTypes: ['research_keyword_cluster', 'draft_cluster_outline', 'write_article'],
        notes: 'Run this workflow first to establish baseline content velocity.',
      },
    ],
    starterNotes: ['Recommended first workflow: Keyword Cluster Pipeline'],
    status: 'active',
  },
  {
    blueprintId: 'contractor_marketing_engine',
    starterSignals: [{ name: 'page_copy_needed' }],
    starterArtifacts: [
      {
        type: 'contractor_service_page_brief',
        title: 'Contractor Service Page Brief',
        content: 'Starter brief: define target city, service category, and conversion CTA blocks.',
        status: 'draft',
      },
    ],
    starterWorkflowTemplates: [
      {
        name: 'service_page_launch',
        jobTypes: ['write_service_page', 'generate_metadata', 'generate_schema'],
      },
    ],
    starterNotes: ['Start with one high-intent service page and expand by location.'],
    status: 'active',
  },
  {
    blueprintId: 'ghost_mart_store',
    starterSignals: [{ name: 'marketplace_gap_detected' }],
    starterArtifacts: [
      {
        type: 'first_listing_draft_note',
        title: 'First Listing Draft Note',
        content: 'Starter note: draft first listing with clear value proposition and category tags.',
        status: 'draft',
      },
    ],
    starterWorkflowTemplates: [
      {
        name: 'listing_bootstrap',
        jobTypes: ['write_article', 'generate_metadata'],
      },
    ],
    starterNotes: ['Publish first listing draft and validate category demand.'],
    status: 'active',
  },
  {
    blueprintId: 'docs_factory',
    starterSignals: [{ name: 'documentation_gap_detected' }],
    starterArtifacts: [
      {
        type: 'docs_export_plan_note',
        title: 'Docs Export Plan Note',
        content: 'Starter note: identify top missing docs and target export format.',
        status: 'draft',
      },
    ],
    starterWorkflowTemplates: [
      {
        name: 'docs_gap_resolution',
        jobTypes: ['write_article', 'scaffold_skill_package'],
      },
    ],
    starterNotes: ['Prioritize quick-win documentation gaps before larger migrations.'],
    status: 'active',
  },
];

function nextSignalId(): string {
  return `signal_${runtimeStore.signals.length + 1}`;
}

function nextArtifactId(): string {
  return `artifact_${runtimeStore.artifacts.length + 1}`;
}

export function getWorkspaceStarterPack(blueprintId: string): WorkspaceStarterPack | undefined {
  return STARTER_PACKS.find((pack) => pack.blueprintId === blueprintId && pack.status === 'active');
}

type InitializeOptions = {
  kickoff?: boolean;
};

export function initializeWorkspace(workspaceId: string, blueprintId: string, options: InitializeOptions = {}) {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const starterPack = getWorkspaceStarterPack(blueprintId);

  if (!starterPack) {
    return { success: false as const, error: `Starter pack not found for blueprint: ${blueprintId}` };
  }

  const now = Date.now();
  const seededSignals: Signal[] = starterPack.starterSignals.map((template, index) => ({
    id: `starter_${nextSignalId()}_${index + 1}`,
    workspaceId: normalizedWorkspaceId,
    name: template.name,
    payload: {
      ...(template.payload ?? {}),
      starterPack: true,
      blueprintId,
    },
    createdAt: now,
  }));

  const seededArtifacts: Artifact[] = starterPack.starterArtifacts.map((template, index) => ({
    id: `starter_${nextArtifactId()}_${index + 1}`,
    workspaceId: normalizedWorkspaceId,
    jobId: `starter_job_${normalizedWorkspaceId}_${index + 1}`,
    type: template.type,
    title: template.title,
    content: template.content,
    status: template.status ?? 'draft',
    createdAt: now,
  }));

  seedStarterRecords({ signals: seededSignals, artifacts: seededArtifacts });

  let kickoffSummary: {
    kickedOff: boolean;
    kickedOffSignalName?: string;
    createdSignalId?: string;
  } = { kickedOff: false };

  if (options.kickoff && starterPack.starterSignals.length > 0) {
    const firstSignal = starterPack.starterSignals[0];
    const kickoff = submitSignalToRuntime({
      workspaceId: normalizedWorkspaceId,
      name: firstSignal.name,
      payload: {
        ...(firstSignal.payload ?? {}),
        kickoff: true,
        starterPack: true,
        blueprintId,
      },
    });

    kickoffSummary = {
      kickedOff: true,
      kickedOffSignalName: firstSignal.name,
      createdSignalId: kickoff.signal.id,
    };
  }

  logEvent({
    type: 'signal_received',
    entityType: 'runtime',
    entityId: normalizedWorkspaceId,
    message: `Workspace ${normalizedWorkspaceId} initialized from blueprint ${blueprintId}`,
    metadata: {
      workspaceId: normalizedWorkspaceId,
      blueprintId,
      kickoff: kickoffSummary,
      starterSignals: seededSignals.map((signal) => signal.name),
      starterArtifacts: seededArtifacts.map((artifact) => artifact.type),
      starterWorkflowTemplates: starterPack.starterWorkflowTemplates,
      starterNotes: starterPack.starterNotes,
    },
  });

  saveRuntimeState();

  return {
    success: true as const,
    workspaceId: normalizedWorkspaceId,
    blueprintId,
    seededSignals,
    seededArtifacts,
    starterPackSummary: {
      starterSignals: seededSignals.length,
      starterArtifacts: seededArtifacts.length,
      starterWorkflowTemplates: starterPack.starterWorkflowTemplates.length,
      starterNotes: starterPack.starterNotes,
    },
    kickoffSummary,
  };
}
