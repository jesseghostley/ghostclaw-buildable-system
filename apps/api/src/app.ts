import express from 'express';
import path from 'path';
import runtimeRouter from './routes/runtime';
import signalsRouter from './routes/signals';
import skillInvocationsRouter from './routes/skill_invocations';
import jobsRouter from './routes/jobs';
import runtimeEventsRouter from './routes/runtime_events';
import ghostMartRouter from './routes/ghost_mart';
import workspacesRouter from './routes/workspaces';
import blueprintsRouter from './routes/blueprints';
import approvalsRouter from './routes/approvals';
import { registerRuntimeEventLogSubscribers } from '../../../packages/core/src/runtime_event_log_subscriber';
import { eventBus } from '../../../packages/core/src/event_bus';

const app = express();

app.use(express.json());

registerRuntimeEventLogSubscribers(eventBus);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ghostclaw-api' });
});

app.use('/api/signals', signalsRouter);
app.use('/api/runtime', runtimeRouter);
app.use('/api/skill-invocations', skillInvocationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/runtime-events', runtimeEventsRouter);
app.use('/api/ghost-mart', ghostMartRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/blueprints', blueprintsRouter);
app.use('/api/approvals', approvalsRouter);

app.use('/sites', express.static(path.join(__dirname, '..', 'output', 'sites')));
app.use(express.static(path.join(__dirname, '..', 'public')));

export default app;
