import { Router } from 'express';
import { processSignal } from '../../../../packages/core/src/runtime_loop';

const router = Router();

const COMMAND_ALIASES: Record<string, string> = {
  'check-runtime': 'runtime_error_detected',
  'test-variation': 'ranking_loss_detected',
  'contractor-sites': 'contractor_site_requested',
  'build-contractor-site': 'contractor_site_requested',
  'export-batch': 'runtime_error_detected',
};

router.post('/run', (req, res) => {
  const command = req.body?.command;

  if (typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: '"command" is required.' });
    return;
  }

  const ctx = req.app.locals.runtimeCtx;

  try {
    const result = processSignal({
      name: COMMAND_ALIASES[command] ?? command,
      payload: req.body?.payload,
    }, ctx);

    res.status(201).json({
      message: 'Command executed.',
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
    const message = error instanceof Error ? error.message : 'Failed to execute command.';
    res.status(422).json({ error: message });
  }
});

export default router;
