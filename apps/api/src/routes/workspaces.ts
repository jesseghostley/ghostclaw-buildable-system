import { Router } from 'express';
import { workspaceStore } from '../../../../packages/workspaces/src/store';

const router = Router();

// GET /api/workspaces — list all workspaces
router.get('/', (_req, res) => {
  const workspaces = workspaceStore.listAll();
  res.json({ workspaces, count: workspaces.length });
});

// GET /api/workspaces/:id — get workspace by ID
router.get('/:id', (req, res) => {
  const ws = workspaceStore.getById(req.params.id);
  if (!ws) {
    res.status(404).json({ error: `Workspace "${req.params.id}" not found.` });
    return;
  }
  res.json(ws);
});

// POST /api/workspaces — create a workspace
router.post('/', (req, res) => {
  const { id, name, description } = req.body ?? {};
  if (!id || !name) {
    res.status(400).json({ error: '"id" and "name" are required.' });
    return;
  }
  if (workspaceStore.getById(id)) {
    res.status(409).json({ error: `Workspace "${id}" already exists.` });
    return;
  }
  const ws = workspaceStore.create({
    id,
    name,
    description: description ?? '',
    status: 'active',
    blueprintIds: [],
    agentIds: [],
    policyIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  res.status(201).json(ws);
});

export default router;
