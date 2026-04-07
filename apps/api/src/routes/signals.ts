import { Router } from 'express';
import { processSignal } from '../../../../packages/core/src/runtime_loop';

const router = Router();

router.post('/', (req, res) => {
  const name = req.body?.name;

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Signal "name" is required.' });
    return;
  }

  const ctx = req.app.locals.runtimeCtx;

  try {
    const result = processSignal({
      name,
      payload: req.body?.payload,
    }, ctx);

    res.status(201).json({
      message: 'Signal processed.',
      ...result,
      storeCounts: {
        signals: ctx.stores.signalStore.listAll().length,
        plans: ctx.stores.planStore.listAll().length,
        jobs: ctx.stores.jobStore.list().length,
        artifacts: ctx.stores.artifactStore.listAll().length,
        skillInvocations: ctx.stores.skillInvocationStore.listAll().length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process signal.';
    res.status(422).json({ error: message });
  }
});

export default router;
