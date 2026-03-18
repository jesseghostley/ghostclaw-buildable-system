import { Router } from 'express';
import { blueprintRegistry } from '../../../../packages/blueprints/src/registry';
import { contractorWebsiteFactory } from '../../../../packages/blueprints/src/contractor_website_factory';

// Ensure seed blueprint is registered.
if (!blueprintRegistry.getById(contractorWebsiteFactory.id)) {
  blueprintRegistry.register(contractorWebsiteFactory);
}

const router = Router();

// GET /api/blueprints — list all blueprints
router.get('/', (_req, res) => {
  const blueprints = blueprintRegistry.listAll();
  res.json({ blueprints, count: blueprints.length });
});

// GET /api/blueprints/active — list active blueprints only
router.get('/active', (_req, res) => {
  const blueprints = blueprintRegistry.listActive();
  res.json({ blueprints, count: blueprints.length });
});

// GET /api/blueprints/:id — get blueprint by ID
router.get('/:id', (req, res) => {
  const bp = blueprintRegistry.getById(req.params.id);
  if (!bp) {
    res.status(404).json({ error: `Blueprint "${req.params.id}" not found.` });
    return;
  }
  res.json(bp);
});

// GET /api/blueprints/by-signal/:signalName — find blueprint for a signal
router.get('/by-signal/:signalName', (req, res) => {
  const bp = blueprintRegistry.getBySignal(req.params.signalName);
  if (!bp) {
    res.status(404).json({ error: `No active blueprint for signal "${req.params.signalName}".` });
    return;
  }
  res.json(bp);
});

// POST /api/blueprints/:id/deactivate — archive a blueprint
router.post('/:id/deactivate', (req, res) => {
  const bp = blueprintRegistry.deactivate(req.params.id);
  if (!bp) {
    res.status(404).json({ error: `Blueprint "${req.params.id}" not found.` });
    return;
  }
  res.json(bp);
});

export default router;
