import express from 'express';
import runtimeRouter from './routes/runtime';
import signalsRouter from './routes/signals';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ghostclaw-api' });
});

app.use('/api/signals', signalsRouter);
app.use('/api/runtime', runtimeRouter);

export default app;
