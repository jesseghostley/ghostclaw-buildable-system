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

describe('Job Output Forwarding — Contractor Website Factory', () => {
  it('step 1 output (siteStructure) is forwarded to step 2 input', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Apex Roofing Co',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.jobs).toHaveLength(3);

    // Step 2 job should have received step 1's output
    const step2Job = res.body.jobs[1];
    expect(step2Job.jobType).toBe('generate_page_content');
    expect(step2Job.inputPayload.previousStepOutput).toBeDefined();
    expect(step2Job.inputPayload.previousStepOutput.siteStructure).toBeDefined();
    expect(step2Job.inputPayload.previousStepOutput.siteStructure.businessName).toBe('Apex Roofing Co');
    expect(step2Job.inputPayload.previousStepOutput.siteStructure.pages).toEqual(
      ['home', 'services', 'about', 'gallery', 'contact'],
    );
  });

  it('step 2 output (pageContent) is forwarded to step 3 input', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Apex Roofing Co',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    // Step 3 job should have received step 2's output
    const step3Job = res.body.jobs[2];
    expect(step3Job.jobType).toBe('review_and_approve');
    expect(step3Job.inputPayload.previousStepOutput).toBeDefined();
    expect(step3Job.inputPayload.previousStepOutput.pageContent).toBeDefined();
    expect(step3Job.inputPayload.previousStepOutput.pagesGenerated).toEqual(
      ['home', 'services', 'about', 'gallery', 'contact'],
    );
  });

  it('step 2 handler uses forwarded site structure sections', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Test Plumbing',
        trade: 'plumbing',
        location: 'NYC',
      },
    });

    // Artifact 2 (generate_page_content) should indicate it used the forwarded structure
    const artifact2Content = JSON.parse(res.body.artifacts[1].content);
    expect(artifact2Content.usedForwardedStructure).toBe(true);
    expect(artifact2Content.pageContent.home.sections).toEqual(
      ['hero', 'services_overview', 'testimonials', 'cta'],
    );
    expect(artifact2Content.pageContent.services.sections).toEqual(
      ['service_list', 'pricing', 'faq'],
    );
  });

  it('step 3 QA report validates forwarded content from step 2', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Test Electric',
        trade: 'electrical',
        location: 'LA',
      },
    });

    const artifact3Content = JSON.parse(res.body.artifacts[2].content);
    expect(artifact3Content.usedForwardedContent).toBe(true);
    expect(artifact3Content.qaReport.contentReceived).toBe(true);
    expect(artifact3Content.qaReport.pageCount).toBe(5);
    expect(artifact3Content.qaReport.passed).toBe(true);
  });

  it('step 1 has no previousStepOutput', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: { businessName: 'First Step Co', trade: 'general', location: 'Anywhere' },
    });

    const step1Job = res.body.jobs[0];
    expect(step1Job.jobType).toBe('design_site_structure');
    expect(step1Job.inputPayload.previousStepOutput).toBeUndefined();
  });

  it('non-contractor workflows still work without forwarding', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'keyword_opportunity_detected',
      payload: { keyword: 'test' },
    });

    expect(res.status).toBe(201);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].inputPayload.previousStepOutput).toBeUndefined();
  });

  it('full 3-step chain produces coherent end-to-end data', async () => {
    const res = await request(app).post('/api/signals').send({
      name: 'contractor_website_requested',
      payload: {
        businessName: 'Summit HVAC',
        trade: 'HVAC',
        location: 'Portland, OR',
      },
    });

    expect(res.body.artifacts).toHaveLength(3);

    const step1 = JSON.parse(res.body.artifacts[0].content);
    const step2 = JSON.parse(res.body.artifacts[1].content);
    const step3 = JSON.parse(res.body.artifacts[2].content);

    // Step 1 → site structure
    expect(step1.siteStructure.businessName).toBe('Summit HVAC');
    expect(step1.siteStructure.trade).toBe('HVAC');

    // Step 2 → page content uses step 1's structure
    expect(step2.siteStructure.businessName).toBe('Summit HVAC');
    expect(step2.pageContent.home.title).toContain('Summit HVAC');
    expect(step2.pageContent.home.title).toContain('HVAC');
    expect(step2.pageContent.home.title).toContain('Portland, OR');

    // Step 3 → QA validates step 2's content
    expect(step3.qaReport.businessName).toBe('Summit HVAC');
    expect(step3.qaReport.pageCount).toBe(5);
    expect(step3.qaReport.contentReceived).toBe(true);
    expect(step3.qaReport.passed).toBe(true);
  });
});
