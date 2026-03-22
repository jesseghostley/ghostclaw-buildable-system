import { Router } from 'express';
import { jobQueue } from '../../../../packages/core/src/job_queue';
import { skillInvocationStore } from '../../../../packages/core/src/skill_invocation';

const router = Router();

router.get('/', (_req, res) => {
  res.json(jobQueue.list());
});

router.get('/:id/skill-invocations', (req, res) => {
  const invocations = skillInvocationStore.listByJobId(req.params.id);
  res.json(invocations);
});

export default router;
