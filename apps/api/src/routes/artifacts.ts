import { Router } from 'express';
import { runtimeStore } from '../../../../packages/core/src/state_store';
import { normalizeWorkspaceId } from '../../../../packages/core/src/workspace_registry';

const router = Router();

function getWorkspaceId(query: Record<string, unknown>): string | undefined {
  const value = query.workspaceId;
  return typeof value === 'string' && value.trim() ? normalizeWorkspaceId(value) : undefined;
}

router.get('/', (req, res) => {
  const workspaceId = getWorkspaceId(req.query as Record<string, unknown>);
  const artifacts = workspaceId
    ? runtimeStore.artifacts.filter((artifact) => normalizeWorkspaceId(artifact.workspaceId) === workspaceId)
    : runtimeStore.artifacts;
  res.json({ workspaceId, artifacts });
});

router.get('/:id', (req, res) => {
  const artifact = runtimeStore.artifacts.find((item) => item.id === req.params.id);

  if (!artifact) {
    res.status(404).json({ error: `Artifact not found: ${req.params.id}` });
    return;
  }

  res.json(artifact);
});

export default router;
