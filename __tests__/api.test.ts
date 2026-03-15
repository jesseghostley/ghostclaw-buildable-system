import request from 'supertest';
import app from '../apps/api/src/app';
import { runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';

beforeEach(() => {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  jobQueue.reset();
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: 'ghostclaw-api' });
  });
});

describe('POST /api/signals', () => {
  it('processes a valid signal and returns 201', async () => {
    const res = await request(app)
      .post('/api/signals')
      .send({ name: 'keyword_opportunity_detected', payload: { topic: 'Test' } });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Signal processed.');
    expect(res.body.signal.name).toBe('keyword_opportunity_detected');
    expect(res.body.plan.action).toBe('generate_content_cluster');
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.artifacts).toHaveLength(1);
    expect(res.body.storeCounts.signals).toBe(1);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/signals').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when name is blank', async () => {
    const res = await request(app).post('/api/signals').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 422 for an unrecognised signal name', async () => {
    const res = await request(app)
      .post('/api/signals')
      .send({ name: 'not_a_real_signal' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/unsupported signal/i);
  });
});

describe('GET /api/runtime/status', () => {
  it('returns zeroed counts on a fresh store', async () => {
    const res = await request(app).get('/api/runtime/status');
    expect(res.status).toBe(200);
    expect(res.body.totalSignals).toBe(0);
    expect(res.body.registeredAgents).toBeGreaterThan(0);
  });

  it('reflects signals processed via /api/signals', async () => {
    await request(app)
      .post('/api/signals')
      .send({ name: 'runtime_error_detected' });

    const res = await request(app).get('/api/runtime/status');
    expect(res.body.totalSignals).toBe(1);
    expect(res.body.totalArtifacts).toBe(1);
  });
});

describe('GET /api/runtime/agents', () => {
  it('returns registered agents including DiagnosticsAgent', async () => {
    const res = await request(app).get('/api/runtime/agents');
    expect(res.status).toBe(200);
    const agentNames: string[] = res.body.agents.map((a: { agentName: string }) => a.agentName);
    expect(agentNames).toContain('DiagnosticsAgent');
  });
});

describe('GET /api/runtime/planner-strategies', () => {
  it('returns all four seeded strategies', async () => {
    const res = await request(app).get('/api/runtime/planner-strategies');
    expect(res.status).toBe(200);
    expect(res.body.strategyCount).toBe(4);
  });
});

describe('GET /api/runtime/queue', () => {
  it('returns queue status with job counts', async () => {
    const res = await request(app).get('/api/runtime/queue');
    expect(res.status).toBe(200);
    expect(typeof res.body.totalJobs).toBe('number');
  });
});

describe('GET /api/runtime/artifacts', () => {
  it('returns artifact list', async () => {
    const res = await request(app).get('/api/runtime/artifacts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.artifacts)).toBe(true);
  });
});
