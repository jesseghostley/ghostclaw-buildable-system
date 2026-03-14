import { Router } from 'express';
import { listPublishTargets, listPublishedOutputs, publishArtifact } from '../../../../packages/core/src/publisher';
import { getWorkspacePolicy, normalizeWorkspaceId } from '../../../../packages/core/src/workspace_registry';

const router = Router();

router.get('/targets', (req, res) => {
  const workspaceIdParam = req.query.workspaceId;
  const workspaceId = typeof workspaceIdParam === 'string' && workspaceIdParam.trim()
    ? normalizeWorkspaceId(workspaceIdParam)
    : undefined;

  const targets = !workspaceId
    ? listPublishTargets()
    : listPublishTargets().filter((target) => getWorkspacePolicy(workspaceId).allowedPublishTargets.includes(target.id));

  res.json({ workspaceId, targets });
});

router.get('/outputs', (req, res) => {
  const workspaceIdParam = req.query.workspaceId;
  const workspaceId = typeof workspaceIdParam === 'string' && workspaceIdParam.trim()
    ? normalizeWorkspaceId(workspaceIdParam)
    : undefined;
  res.json({ workspaceId, outputs: listPublishedOutputs(workspaceId) });
});

router.post('/artifacts/:id', (req, res) => {
  const targetId = req.body?.targetId;
  if (typeof targetId !== 'string' || !targetId.trim()) {
    res.status(400).json({ success: false, error: 'targetId is required.' });
    return;
  }

  const result = publishArtifact(req.params.id, targetId);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

export default router;
