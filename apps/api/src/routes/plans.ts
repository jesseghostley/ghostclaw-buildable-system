import { Router } from 'express';
import { getPlan, listPlans } from '../../../../packages/core/src/state_store';
import { normalizeWorkspaceId } from '../../../../packages/core/src/workspace_registry';

const router = Router();

router.get('/', (req, res) => {
  const workspaceIdParam = req.query.workspaceId;
  const workspaceId = typeof workspaceIdParam === 'string' && workspaceIdParam.trim()
    ? normalizeWorkspaceId(workspaceIdParam)
    : undefined;

  res.json({ workspaceId, plans: listPlans(workspaceId) });
});

router.get('/:id', (req, res) => {
  const plan = getPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: `Plan not found: ${req.params.id}` });
    return;
  }

  res.json(plan);
});

export default router;
