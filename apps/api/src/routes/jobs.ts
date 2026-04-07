import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  res.json(ctx.stores.jobStore.list());
});

router.get('/:id/skill-invocations', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  const invocations = ctx.stores.skillInvocationStore.listByJobId(req.params.id);
  res.json(invocations);
});

export default router;
