import { Router } from 'express';
import {
  getAgentStatus,
  getArtifactStatus,
  getEventStatus,
  getQueueStatus,
  getRuntimeStatus,
  getSkillStatus,
  getWorkflowStatuses,
} from '../../../../packages/core/src/runtime_monitor';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getRuntimeStatus());
});

router.get('/queue', (_req, res) => {
  res.json(getQueueStatus());
});

router.get('/workflows', (_req, res) => {
  res.json(getWorkflowStatuses());
});

router.get('/events', (_req, res) => {
  res.json(getEventStatus());
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
