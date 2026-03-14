import { Router } from 'express';
import {
  requeueJob,
  resetRuntimeState,
  retryJob,
  submitTestSignal,
} from '../../../../packages/core/src/runtime_control';

const router = Router();

router.post('/jobs/:id/retry', (req, res) => {
  const result = retryJob(req.params.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/jobs/:id/requeue', (req, res) => {
  const result = requeueJob(req.params.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/signals/test', (req, res) => {
  const signalName = req.body?.signalName;
  const result = submitTestSignal(signalName);

  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/reset', (_req, res) => {
  res.json(resetRuntimeState());
});

export default router;
