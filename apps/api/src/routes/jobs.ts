import { Router } from 'express';
import { normalizeWorkspaceId } from '../../../../packages/core/src/workspace_registry';
import { runtimeStore } from '../../../../packages/core/src/state_store';

const router = Router();

function getWorkspaceId(query: Record<string, unknown>): string | undefined {
  const value = query.workspaceId;
  return typeof value === 'string' && value.trim() ? normalizeWorkspaceId(value) : undefined;
}

router.get('/', (req, res) => {
  const workspaceId = getWorkspaceId(req.query as Record<string, unknown>);
  const jobs = workspaceId
    ? runtimeStore.jobs.filter((job) => normalizeWorkspaceId(job.workspaceId) === workspaceId)
    : runtimeStore.jobs;
  res.json({ workspaceId, jobs });
});

router.get('/:id', (req, res) => {
  const job = runtimeStore.jobs.find((item) => item.id === req.params.id);

  if (!job) {
    res.status(404).json({ error: `Job not found: ${req.params.id}` });
    return;
  }

  res.json(job);
});

export default router;
