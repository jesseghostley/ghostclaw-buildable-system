import { Router } from 'express';
import { listPublishTargets, listPublishedOutputs, publishArtifact } from '../../../../packages/core/src/publisher';

const router = Router();

router.get('/targets', (_req, res) => {
  res.json({ targets: listPublishTargets() });
});

router.get('/outputs', (_req, res) => {
  res.json({ outputs: listPublishedOutputs() });
});

router.post('/artifacts/:id', (req, res) => {
  const targetId = req.body?.targetId;
  if (typeof targetId !== 'string' || !targetId.trim()) {
    res.status(400).json({ success: false, error: 'targetId is required.' });
    return;
  }

  const result = publishArtifact(req.params.id, targetId);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

export default router;
