import { Router } from 'express';
import { getWorkspaceStarterPack } from '../../../../packages/core/src/workspace_initializer';
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

router.get('/:id/starter-pack', (req, res) => {
  const workspace = listWorkspaces().find((item) => item.id === req.params.id);
  if (!workspace) {
    res.status(404).json({ success: false, error: `Workspace not found: ${req.params.id}` });
    return;
  }

  const blueprint = listBlueprints().find((item) => item.category === workspace.category);
  if (!blueprint) {
    res.status(404).json({ success: false, error: `No blueprint mapped for workspace ${workspace.id}` });
    return;
  }

  const starterPack = getWorkspaceStarterPack(blueprint.id);
  if (!starterPack) {
    res.status(404).json({ success: false, error: `Starter pack not found for blueprint ${blueprint.id}` });
    return;
  }

  res.json({ workspaceId: workspace.id, blueprintId: blueprint.id, starterPack });
});

router.post('/from-blueprint', (req, res) => {
  const blueprintId = req.body?.blueprintId;
  const workspaceName = req.body?.workspaceName;
  const workspaceId = req.body?.workspaceId;
  const initialize = req.body?.initialize === true;
  const kickoff = req.body?.kickoff === true;

  if (typeof blueprintId !== 'string' || !blueprintId.trim()) {
    res.status(400).json({ success: false, error: 'blueprintId is required.' });
    return;
  }

  if (typeof workspaceName !== 'string' || !workspaceName.trim()) {
    res.status(400).json({ success: false, error: 'workspaceName is required.' });
    return;
  }

  const result = createWorkspaceFromBlueprint(blueprintId, workspaceName, workspaceId, initialize, kickoff);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.status(201).json(result);
});

export default router;
