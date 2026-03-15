import express from 'express';
import runtimeRouter from './routes/runtime';
import signalsRouter from './routes/signals';
import skillInvocationsRouter from './routes/skill_invocations';
import jobsRouter from './routes/jobs';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ghostclaw-api' });
});

app.use('/api/signals', signalsRouter);
app.use('/api/runtime', runtimeRouter);
app.use('/api/skill-invocations', skillInvocationsRouter);
app.use('/api/jobs', jobsRouter);

export default app;
