import request from 'supertest';
import app from '../apps/api/src/app';
import { runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { auditLog } from '../packages/core/src/audit_log';
import { publishEventStore } from '../packages/core/src/publish_event';
import { eventBus } from '../packages/core/src/event_bus';
import { skillRegistry } from '../packages/skills/src/registry';
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

// ── Skill Registry State ────────────────────────────────────────────────────

describe('Skill Registry — all 3 contractor skills registered', () => {
  it('design_site_structure is in the skill registry', () => {
    const skill = skillRegistry.getById('design_site_structure');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('Design Site Structure');
    expect(skill!.version).toBe('1.0.0');
    expect(skill!.requiredCapabilities).toEqual(['design_site_structure']);
  });

  it('generate_page_content is in the skill registry', () => {
    const skill = skillRegistry.getById('generate_page_content');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('Generate Page Content');
    expect(skill!.requiredCapabilities).toEqual(['generate_page_content']);
  });

  it('review_and_approve is in the skill registry', () => {
    const skill = skillRegistry.getById('review_and_approve');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('Review and Approve');
    expect(skill!.requiredCapabilities).toEqual(['review_and_approve']);
  });

  it('skill registry has exactly 3 skills', () => {
    const skills = skillRegistry.listAll();
    expect(skills).toHaveLength(3);
    const ids = skills.map((s) => s.id).sort();
    expect(ids).toEqual(['design_site_structure', 'generate_page_content', 'review_and_approve']);
  });
});

// ── Executor uses Skill Registry ────────────────────────────────────────────

describe('Executor resolves contractor jobs via skill registry', () => {
  it('all 3 contractor artifacts are tagged with resolvedVia=skill_registry', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Apex Roofing Co',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.artifacts).toHaveLength(3);

    for (const artifact of res.body.artifacts) {
      const content = JSON.parse(artifact.content);
      expect(content.resolvedVia).toBe('skill_registry');
    }
  });

  it('step 1 (design_site_structure) runs through skill registry', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Test Co', trade: 'plumbing', location: 'NYC' },
    });

    const step1 = JSON.parse(res.body.artifacts[0].content);
    expect(step1.resolvedVia).toBe('skill_registry');
    expect(step1.siteStructure.businessName).toBe('Test Co');
    expect(step1.siteStructure.pages).toHaveLength(5);
  });

  it('step 2 (generate_page_content) runs through skill registry with forwarding', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Test Co', trade: 'plumbing', location: 'NYC' },
    });

    const step2 = JSON.parse(res.body.artifacts[1].content);
    expect(step2.resolvedVia).toBe('skill_registry');
    expect(step2.usedForwardedStructure).toBe(true);
    expect(step2.pagesGenerated).toEqual(['home', 'services', 'about', 'gallery', 'contact']);
  });

  it('step 3 (review_and_approve) runs through skill registry with forwarding', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Test Co', trade: 'plumbing', location: 'NYC' },
    });

    const step3 = JSON.parse(res.body.artifacts[2].content);
    expect(step3.resolvedVia).toBe('skill_registry');
    expect(step3.usedForwardedContent).toBe(true);
    expect(step3.qaReport.pageCount).toBe(5);
    expect(step3.qaReport.passed).toBe(true);
    expect(step3.qaReport.requiresApproval).toBe(true);
  });
});

// ── Legacy jobs still work via fallback ─────────────────────────────────────

describe('Legacy jobs use LEGACY_JOB_HANDLERS fallback', () => {
  it('keyword_opportunity_detected resolves without skill registry', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'keyword_opportunity_detected',
      payload: { keyword: 'test' },
    });

    expect(res.status).toBe(201);
    expect(res.body.artifacts).toHaveLength(1);

    const content = JSON.parse(res.body.artifacts[0].content);
    // Legacy handlers don't get the resolvedVia tag
    expect(content.resolvedVia).toBeUndefined();
    expect(content.result).toContain('Cluster outline generated');
  });

  it('ranking_loss_detected resolves without skill registry', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'ranking_loss_detected',
      payload: { page: '/about' },
    });

    expect(res.status).toBe(201);
    const content = JSON.parse(res.body.artifacts[0].content);
    expect(content.resolvedVia).toBeUndefined();
    expect(content.result).toContain('Page sections refreshed');
  });
});

// ── Skill Registry execute() matches executor output ────────────────────────

describe('Skill registry standalone execution matches executor', () => {
  it('design_site_structure produces identical output both ways', () => {
    const input = {
      signalName: 'contractor_website_requested',
      signalPayload: { businessName: 'Test Co', trade: 'roofing' },
    };

    const output = skillRegistry.execute('design_site_structure', input);
    expect(output.siteStructure).toBeDefined();
    expect((output.siteStructure as Record<string, unknown>).businessName).toBe('Test Co');
  });

  it('generate_page_content with previousStepOutput works standalone', () => {
    const input = {
      signalName: 'contractor_website_requested',
      signalPayload: { businessName: 'Test Co', trade: 'roofing', location: 'Denver' },
      previousStepOutput: {
        siteStructure: {
          pages: ['home', 'services'],
          sections: { home: ['hero'], services: ['list'] },
        },
      },
    };

    const output = skillRegistry.execute('generate_page_content', input);
    expect(output.usedForwardedStructure).toBe(true);
    expect(output.pagesGenerated).toEqual(['home', 'services']);
  });

  it('review_and_approve with previousStepOutput works standalone', () => {
    const input = {
      signalName: 'contractor_website_requested',
      signalPayload: { businessName: 'Test Co' },
      previousStepOutput: {
        pageContent: { home: {}, services: {}, about: {} },
        pagesGenerated: ['home', 'services', 'about'],
      },
    };

    const output = skillRegistry.execute('review_and_approve', input);
    expect(output.usedForwardedContent).toBe(true);
    const qa = output.qaReport as Record<string, unknown>;
    expect(qa.pageCount).toBe(3);
    expect(qa.passed).toBe(true);
  });

  it('review_and_approve fails validation when no content forwarded', () => {
    const input = {
      signalName: 'contractor_website_requested',
      signalPayload: { businessName: 'Test Co' },
    };

    const output = skillRegistry.execute('review_and_approve', input);
    expect(output.usedForwardedContent).toBe(false);
    const qa = output.qaReport as Record<string, unknown>;
    expect(qa.contentReceived).toBe(false);
    expect(qa.passed).toBe(false);
  });
});

// ── End-to-end: approval flow still works with skill-registry executor ──────

describe('Full approval flow via skill-registry executor', () => {
  it('contractor signal → skill-registry execution → approval → publish', async () => {
    // 1. Signal
    const signalRes = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'Summit HVAC', trade: 'HVAC', location: 'Portland, OR' },
    });
    expect(signalRes.status).toBe(201);

    // All 3 steps used skill registry
    for (const artifact of signalRes.body.artifacts) {
      expect(JSON.parse(artifact.content).resolvedVia).toBe('skill_registry');
    }

    // 2. Pending approval exists
    const pendingRes = await request(app).get('/api/approvals/pending');
    expect(pendingRes.body.count).toBeGreaterThanOrEqual(1);
    const pubId = pendingRes.body.pending[0].id;

    // 3. Approve
    const approveRes = await request(app)
      .post(`/api/approvals/${pubId}/approve`)
      .send({ approvedBy: 'operator:jesse' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');

    // 4. Publish
    const publishRes = await request(app)
      .post(`/api/approvals/${pubId}/publish`)
      .send({ externalUrl: 'https://summithvac.example.com' });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe('published');

    // 5. Audit trail intact
    const entries = auditLog.listAll();
    expect(entries.find((e) => e.eventType === 'publish_event.approved')).toBeDefined();
    expect(entries.find((e) => e.eventType === 'publish_event.published')).toBeDefined();
  });
});
