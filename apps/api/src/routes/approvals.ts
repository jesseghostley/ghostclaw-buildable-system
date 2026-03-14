import { Router } from 'express';
import {
  approveJob,
  publishJob,
  rejectJob,
  submitForReview,
} from '../../../../packages/core/src/approval_workflow';

const router = Router();

router.post('/jobs/:id/submit', (req, res) => {
  const result = submitForReview(req.params.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/jobs/:id/approve', (req, res) => {
  const result = approveJob(req.params.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/jobs/:id/reject', (req, res) => {
  const result = rejectJob(req.params.id, req.body?.reason);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

router.post('/jobs/:id/publish', (req, res) => {
  const result = publishJob(req.params.id);
  if (!result.success) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

export default router;
