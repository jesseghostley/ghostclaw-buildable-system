import { Router } from 'express';
import { skillInvocationStore } from '../../../../packages/core/src/skill_invocation';

const router = Router();

router.get('/', (_req, res) => {
  res.json(skillInvocationStore.listAll());
});

router.get('/:id', (req, res) => {
  const invocation = skillInvocationStore.getById(req.params.id);
  if (!invocation) {
    res.status(404).json({ error: 'Skill invocation not found.' });
    return;
  }
  res.json(invocation);
});

export default router;
