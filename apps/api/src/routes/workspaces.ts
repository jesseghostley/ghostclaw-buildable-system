import { Router } from 'express';
import { createWorkspaceFromBlueprint, listBlueprints } from '../../../../packages/core/src/workspace_blueprints';
import { getWorkspacePolicy, listWorkspaces } from '../../../../packages/core/src/workspace_registry';

const router = Router();

router.get('/blueprints', (_req, res) => {
  res.json({ blueprints: listBlueprints() });
});

router.get('/', (_req, res) => {
  const workspaces = listWorkspaces().map((workspace) => ({
    ...workspace,
    policy: getWorkspacePolicy(workspace.id),
  }));

  res.json({ workspaces });
});

router.post('/from-blueprint', (req, res) => {
  const blueprintId = req.body?.blueprintId;
  const workspaceName = req.body?.workspaceName;
  const workspaceId = req.body?.workspaceId;

  if (typeof blueprintId !== 'string' || !blueprintId.trim()) {
    res.status(400).json({ success: false, error: 'blueprintId is required.' });
    return;
  }

  if (typeof workspaceName !== 'string' || !workspaceName.trim()) {
    res.status(400).json({ success: false, error: 'workspaceName is required.' });
    return;
  }

  const result = createWorkspaceFromBlueprint(blueprintId, workspaceName, workspaceId);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.status(201).json(result);
});

export default router;
