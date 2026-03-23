import { Router } from 'express';
import { processSignal, runtimeStore } from '../../../../packages/core/src/runtime_loop';
import { skillInvocationStore } from '../../../../packages/core/src/skill_invocation';

const router = Router();

router.post('/run', (req, res) => {
  const command = req.body?.command;

  if (typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: '"command" is required.' });
    return;
  }

  try {
    const result = processSignal({
      name: command,
      payload: req.body?.payload,
    });

    res.status(201).json({
      message: 'Command executed.',
      ...result,
      storeCounts: {
        signals: runtimeStore.signals.length,
        plans: runtimeStore.plans.length,
        jobs: runtimeStore.jobs.length,
        artifacts: runtimeStore.artifacts.length,
        skillInvocations: skillInvocationStore.listAll().length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute command.';
    res.status(422).json({ error: message });
  }
});

export default router;
