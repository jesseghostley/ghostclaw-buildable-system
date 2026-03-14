import fs from 'fs';
import path from 'path';
import { logEvent } from './event_log';
import { saveRuntimeState } from './runtime_persistence';
import { runtimeStore } from './state_store';
import type { PublishTarget } from '../../shared/src/types/publish_target';
import { normalizeWorkspaceId } from './workspace_registry';

export type PublishedOutput = {
  id: string;
  workspaceId: string;
  artifactId: string;
  targetId: string;
  title: string;
  content: string;
  publishedAt: number;
};

const PUBLISH_TARGETS: PublishTarget[] = [
  {
    id: 'local_files',
    name: 'Local Files',
    category: 'filesystem',
    description: 'Writes artifact outputs to local runtime-data published files.',
    status: 'active',
  },
  {
    id: 'ghost_mart_drafts',
    name: 'Ghost Mart Drafts',
    category: 'marketplace',
    description: 'Stores draft outputs for Ghost Mart publishing queue.',
    status: 'active',
  },
  {
    id: 'website_drafts',
    name: 'Website Drafts',
    category: 'web',
    description: 'Stores draft website content output records.',
    status: 'active',
  },
  {
    id: 'docs_exports',
    name: 'Docs Exports',
    category: 'docs',
    description: 'Stores documentation export output records.',
    status: 'active',
  },
];

const PUBLISHED_DIR = path.resolve(process.cwd(), '.runtime-data', 'published');

function ensurePublishedDir() {
  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
}

function nextPublishedId(): string {
  return `published_${runtimeStore.publishedOutputs.length + 1}`;
}

export function listPublishTargets(): PublishTarget[] {
  return PUBLISH_TARGETS;
}

export function listPublishedOutputs(workspaceId?: string): PublishedOutput[] {
  if (!workspaceId) {
    return runtimeStore.publishedOutputs;
  }

  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  return runtimeStore.publishedOutputs.filter(
    (output) => normalizeWorkspaceId(output.workspaceId) === normalizedWorkspaceId,
  );
}

export function publishArtifact(artifactId: string, targetId: string): { success: boolean; error?: string; output?: PublishedOutput } {
  const target = PUBLISH_TARGETS.find((item) => item.id === targetId && item.status === 'active');
  if (!target) {
    return { success: false, error: `Unknown or inactive publish target: ${targetId}` };
  }

  const artifact = runtimeStore.artifacts.find((item) => item.id === artifactId);
  if (!artifact) {
    return { success: false, error: `Artifact not found: ${artifactId}` };
  }

  if (artifact.status !== 'approved' && artifact.status !== 'published') {
    return { success: false, error: `Artifact ${artifactId} must be approved or published before publish.` };
  }

  const workspaceId = normalizeWorkspaceId(artifact.workspaceId);
  const output: PublishedOutput = {
    id: nextPublishedId(),
    workspaceId,
    artifactId,
    targetId,
    title: artifact.title,
    content: artifact.content,
    publishedAt: Date.now(),
  };

  runtimeStore.publishedOutputs.push(output);

  if (targetId === 'local_files') {
    ensurePublishedDir();
    const filePath = path.join(PUBLISHED_DIR, `${output.id}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...output, metadata: { workspaceId } }, null, 2),
      'utf8',
    );
  }

  logEvent({
    type: 'job_published',
    entityType: 'artifact',
    entityId: artifactId,
    message: `Artifact ${artifactId} published to ${targetId}`,
    metadata: { publishedOutputId: output.id, targetId, workspaceId },
  });

  saveRuntimeState();

  return { success: true, output };
}
