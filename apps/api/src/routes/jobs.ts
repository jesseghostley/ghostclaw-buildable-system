import { Router } from 'express';
import { runtimeStore } from '../../../../packages/core/src/runtime_loop';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ jobs: runtimeStore.jobs });
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
