import { Router } from 'express';
import { runtimeStore } from '../../../../packages/core/src/state_store';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ artifacts: runtimeStore.artifacts });
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
