import { Router } from 'express';
import {
  getAgentStatus,
  getArtifactStatus,
  getEventStatus,
  getPublishStatus,
  getQueueStatus,
  getRuntimeStatus,
  getSkillStatus,
  getWorkflowStatuses,
  getWorkspaceStatus,
} from '../../../../packages/core/src/runtime_monitor';

const router = Router();

function workspaceParam(req: { query: Record<string, unknown> }): string | undefined {
  const workspaceId = req.query.workspaceId;
  return typeof workspaceId === 'string' && workspaceId.trim() ? workspaceId : undefined;
}

router.get('/status', (req, res) => {
  res.json(getRuntimeStatus(workspaceParam(req)));
});

router.get('/queue', (req, res) => {
  res.json(getQueueStatus(workspaceParam(req)));
});

router.get('/workflows', (req, res) => {
  res.json(getWorkflowStatuses(workspaceParam(req)));
});

router.get('/events', (req, res) => {
  res.json(getEventStatus(workspaceParam(req)));
});

router.get('/agents', (_req, res) => {
  res.json(getAgentStatus());
});

router.get('/skills', (_req, res) => {
  res.json(getSkillStatus());
});

router.get('/publish', (req, res) => {
  res.json(getPublishStatus(workspaceParam(req)));
});

router.get('/artifacts', (req, res) => {
  res.json(getArtifactStatus(workspaceParam(req)));
});

router.get('/workspaces', (req, res) => {
  res.json(getWorkspaceStatus(workspaceParam(req)));
});

export default router;
