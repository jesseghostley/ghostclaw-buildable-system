import request from 'supertest';
import app from '../apps/api/src/app';
import { runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { auditLog } from '../packages/core/src/audit_log';
import { publishEventStore } from '../packages/core/src/publish_event';
import { eventBus } from '../packages/core/src/event_bus';
import {
  registerRuntimeSubscribers,
  resetSubscriberState,
} from '../packages/core/src/runtime_subscribers';

function resetAll() {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
  assignmentStore.reset();
  auditLog.reset();
  publishEventStore.reset();
  eventBus.reset();
  resetSubscriberState();
  registerRuntimeSubscribers();
}

beforeEach(resetAll);

// ── Workspaces API ──────────────────────────────────────────────────────────

describe('GET /api/workspaces', () => {
  it('returns the default workspace', async () => {
    const res = await request(app).get('/api/workspaces');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const defaultWs = res.body.workspaces.find((w: { id: string }) => w.id === 'default');
    expect(defaultWs).toBeDefined();
    expect(defaultWs.name).toBe('Default Workspace');
    expect(defaultWs.blueprintIds).toContain('bp_contractor_website_factory');
  });
});

describe('GET /api/workspaces/:id', () => {
  it('returns a workspace by ID', async () => {
    const res = await request(app).get('/api/workspaces/default');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('default');
  });

  it('returns 404 for unknown workspace', async () => {
    const res = await request(app).get('/api/workspaces/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/workspaces', () => {
  it('creates a new workspace', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ id: 'ws_test', name: 'Test Workspace', description: 'For testing' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('ws_test');
    expect(res.body.status).toBe('active');
  });

  it('rejects missing name', async () => {
    const res = await request(app).post('/api/workspaces').send({ id: 'ws_bad' });
    expect(res.status).toBe(400);
  });
});

// ── Blueprints API ──────────────────────────────────────────────────────────

describe('GET /api/blueprints', () => {
  it('returns registered blueprints including contractor website factory', async () => {
    const res = await request(app).get('/api/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const bp = res.body.blueprints.find(
      (b: { id: string }) => b.id === 'bp_contractor_website_factory',
    );
    expect(bp).toBeDefined();
    expect(bp.name).toBe('Contractor Website Factory');
    expect(bp.steps).toHaveLength(3);
  });
});

describe('GET /api/blueprints/:id', () => {
  it('returns blueprint by ID', async () => {
    const res = await request(app).get('/api/blueprints/bp_contractor_website_factory');
    expect(res.status).toBe(200);
    expect(res.body.triggerSignal).toBe('contractor_website_requested');
    expect(res.body.requiredAgents).toEqual(['SiteArchitectAgent', 'PageContentAgent', 'QAReviewAgent']);
    expect(res.body.approvalGates).toHaveLength(1);
    expect(res.body.approvalGates[0].type).toBe('operator');
  });

  it('returns 404 for unknown blueprint', async () => {
    const res = await request(app).get('/api/blueprints/nonexistent');
    expect(res.status).toBe(404);
  });
});

// ── Approvals API ───────────────────────────────────────────────────────────

describe('Approvals API — full flow', () => {
  it('runs contractor website signal then approves and publishes via API', async () => {
    // 1. Send the signal
    const signalRes = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Apex Roofing Co',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });
    expect(signalRes.status).toBe(201);
    expect(signalRes.body.jobs).toHaveLength(3);

    // 2. Check pending approvals
    const pendingRes = await request(app).get('/api/approvals/pending');
    expect(pendingRes.status).toBe(200);
    const cmsPending = pendingRes.body.pending.filter(
      (e: { destination: string }) => e.destination === 'website_cms',
    );
    expect(cmsPending.length).toBeGreaterThanOrEqual(1);
    const pubId = cmsPending[0].id;

    // 3. Approve
    const approveRes = await request(app)
      .post(`/api/approvals/${pubId}/approve`)
      .send({ approvedBy: 'operator:jesse' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');
    expect(approveRes.body.approvedBy).toBe('operator:jesse');

    // 4. Publish
    const publishRes = await request(app)
      .post(`/api/approvals/${pubId}/publish`)
      .send({ externalUrl: 'https://apexroofing.example.com' });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe('published');
    expect(publishRes.body.externalUrl).toBe('https://apexroofing.example.com');

    // 5. Verify audit trail
    const auditEntries = auditLog.listAll();
    const approvedAudit = auditEntries.find((e) => e.eventType === 'publish_event.approved');
    expect(approvedAudit).toBeDefined();
    expect(approvedAudit!.actorId).toBe('operator:jesse');

    const publishedAudit = auditEntries.find((e) => e.eventType === 'publish_event.published');
    expect(publishedAudit).toBeDefined();
  });

  it('rejects approval of non-pending event', async () => {
    // Send signal to create a pending event
    await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Test Co', trade: 'plumbing', location: 'NYC' },
    });

    const pendingRes = await request(app).get('/api/approvals/pending');
    const cmsPending = pendingRes.body.pending.filter(
      (e: { destination: string }) => e.destination === 'website_cms',
    );
    const pubId = cmsPending[0].id;

    // Approve once
    await request(app).post(`/api/approvals/${pubId}/approve`).send({ approvedBy: 'op:test' });

    // Try to approve again — should fail
    const res = await request(app).post(`/api/approvals/${pubId}/approve`).send({ approvedBy: 'op:test' });
    expect(res.status).toBe(409);
  });

  it('can reject a pending event', async () => {
    await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Bad Site Co', trade: 'general', location: 'LA' },
    });

    const pendingRes = await request(app).get('/api/approvals/pending');
    const cmsPending = pendingRes.body.pending.filter(
      (e: { destination: string }) => e.destination === 'website_cms',
    );
    const pubId = cmsPending[0].id;

    const res = await request(app)
      .post(`/api/approvals/${pubId}/reject`)
      .send({ rejectedBy: 'operator:jesse', reason: 'Content needs revision.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.failureReason).toBe('Content needs revision.');
  });
});
