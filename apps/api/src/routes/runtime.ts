import { Router } from 'express';
import {
  getAgentStatus,
  getArtifactStatus,
  getPlannerStrategyStatus,
  getQueueStatus,
  getRuntimeStatus,
} from '../../../../packages/core/src/runtime_monitor';

const router = Router();

router.get('/status', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  res.json(getRuntimeStatus(ctx));
});

router.get('/queue', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  res.json(getQueueStatus(ctx));
});

router.get('/agents', (_req, res) => {
  res.json(getAgentStatus());
});

router.get('/artifacts', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  res.json(getArtifactStatus(ctx));
});

router.get('/planner-strategies', (req, res) => {
  const ctx = req.app.locals.runtimeCtx;
  res.json(getPlannerStrategyStatus(ctx));
});

export default router;
