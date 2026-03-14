import express from 'express';
import artifactsRouter from './routes/artifacts';
import controlRouter from './routes/control';
import jobsRouter from './routes/jobs';
import runtimeRouter from './routes/runtime';
import signalsRouter from './routes/signals';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ghostclaw-api' });
});

app.use('/api/signals', signalsRouter);
app.use('/api/runtime', runtimeRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/artifacts', artifactsRouter);
app.use('/api/control', controlRouter);

export default app;
