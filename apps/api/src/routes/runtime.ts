import { Router } from 'express';
import {
  getAgentStatus,
  getArtifactStatus,
  getQueueStatus,
  getRuntimeStatus,
  getSkillStatus,
} from '../../../../packages/core/src/runtime_monitor';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getRuntimeStatus());
});

router.get('/queue', (_req, res) => {
  res.json(getQueueStatus());
});

router.get('/agents', (_req, res) => {
  res.json(getAgentStatus());
});

router.get('/skills', (_req, res) => {
  res.json(getSkillStatus());
});

router.get('/artifacts', (_req, res) => {
  res.json(getArtifactStatus());
});

export default router;
