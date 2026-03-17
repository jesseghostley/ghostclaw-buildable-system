import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
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

describe('Contractor Website Factory — end-to-end', () => {
  const signalPayload = {
    businessName: 'Apex Roofing Co',
    trade: 'roofing',
    location: 'Denver, CO',
    phone: '303-555-0199',
    email: 'info@apexroofing.example.com',
  };

  it('processes a contractor_website_requested signal through the full pipeline', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    // Signal created
    expect(result.signal.name).toBe('contractor_website_requested');
    expect(result.signal.payload).toEqual(signalPayload);

    // Plan routes to build_contractor_website action
    expect(result.plan.action).toBe('build_contractor_website');
    expect(result.plan.strategyId).toBe('rule_contractor_website_strategy');

    // 3 jobs created in order
    expect(result.jobs).toHaveLength(3);
    expect(result.jobs.map((j) => j.jobType)).toEqual([
      'design_site_structure',
      'generate_page_content',
      'review_and_approve',
    ]);

    // All jobs completed
    result.jobs.forEach((job) => {
      expect(job.status).toBe('completed');
    });

    // 3 artifacts produced
    expect(result.artifacts).toHaveLength(3);

    // 3 skill invocations completed
    expect(result.skillInvocations).toHaveLength(3);
    result.skillInvocations.forEach((inv) => {
      expect(inv.status).toBe('completed');
    });

    // 3 assignments (one per job)
    expect(result.assignments).toHaveLength(3);
  });

  it('assigns correct agents to each job', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const agentsByJob = result.assignments.map((a) => ({
      jobId: a.jobId,
      agent: a.agentName,
    }));

    expect(agentsByJob).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ agent: 'SiteArchitectAgent' }),
        expect.objectContaining({ agent: 'PageContentAgent' }),
        expect.objectContaining({ agent: 'QAReviewAgent' }),
      ]),
    );
  });

  it('produces correct site structure artifact', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const structureArtifact = result.artifacts.find(
      (a) => a.type === 'design_site_structure',
    );
    expect(structureArtifact).toBeDefined();

    const content = JSON.parse(structureArtifact!.content);
    expect(content.siteStructure).toBeDefined();
    expect(content.siteStructure.businessName).toBe('Apex Roofing Co');
    expect(content.siteStructure.trade).toBe('roofing');
    expect(content.siteStructure.pages).toEqual(
      expect.arrayContaining(['home', 'services', 'about', 'gallery', 'contact']),
    );
  });

  it('produces page content artifact with business details', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const contentArtifact = result.artifacts.find(
      (a) => a.type === 'generate_page_content',
    );
    expect(contentArtifact).toBeDefined();

    const content = JSON.parse(contentArtifact!.content);
    expect(content.pageContent.home.title).toContain('Apex Roofing Co');
    expect(content.pageContent.home.title).toContain('roofing');
    expect(content.pageContent.home.title).toContain('Denver, CO');
  });

  it('produces QA report that requires approval', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const qaArtifact = result.artifacts.find(
      (a) => a.type === 'review_and_approve',
    );
    expect(qaArtifact).toBeDefined();

    const content = JSON.parse(qaArtifact!.content);
    expect(content.qaReport.passed).toBe(true);
    expect(content.qaReport.requiresApproval).toBe(true);
    expect(content.qaReport.checksPerformed).toContain('site_structure_completeness');
    expect(content.qaReport.checksPerformed).toContain('content_quality');
  });

  it('creates a pending publish event (approval gate) for the QA artifact', () => {
    processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    // The QA review_and_approve handler creates a targeted publish event
    // to website_cms with status 'pending' — this is the approval gate.
    const cmsPubEvents = publishEventStore.listAll().filter(
      (e) => e.destination === 'website_cms',
    );
    expect(cmsPubEvents).toHaveLength(1);
    expect(cmsPubEvents[0].status).toBe('pending');
    expect(cmsPubEvents[0].publishedBy).toBe('QAReviewAgent');
  });

  it('writes audit log entries for all pipeline stages', () => {
    processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const allEntries = auditLog.listAll();
    const eventTypes = allEntries.map((e) => e.eventType);

    // Must have signal, plan, skill invocation, artifact, and publish entries
    expect(eventTypes).toContain('signal.received');
    expect(eventTypes).toContain('plan.created');
    expect(eventTypes).toContain('skill_invocation.started');
    expect(eventTypes).toContain('skill_invocation.completed');
    expect(eventTypes).toContain('artifact.created');
    expect(eventTypes).toContain('job.completed');
    expect(eventTypes).toContain('publish_event.initiated');

    // At least 3 job.completed entries (one per job)
    const jobCompleted = allEntries.filter((e) => e.eventType === 'job.completed');
    expect(jobCompleted.length).toBeGreaterThanOrEqual(3);
  });

  it('emits events in correct lifecycle order', () => {
    processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    const history = eventBus.getHistory();
    const eventNames = history.map((e) => e.event);

    // Core lifecycle ordering
    const signalIdx = eventNames.indexOf('signal.received');
    const planIdx = eventNames.indexOf('plan.created');
    const jobQueuedIdx = eventNames.indexOf('job.queued');
    const jobAssignedIdx = eventNames.indexOf('job.assigned');
    const skillStartIdx = eventNames.indexOf('skill.invocation.started');
    const skillCompletedIdx = eventNames.indexOf('skill.invocation.completed');
    const artifactIdx = eventNames.indexOf('artifact.created');

    expect(signalIdx).toBeGreaterThanOrEqual(0);
    expect(planIdx).toBeGreaterThan(signalIdx);
    expect(jobQueuedIdx).toBeGreaterThan(planIdx);
    expect(jobAssignedIdx).toBeGreaterThan(jobQueuedIdx);
    expect(skillStartIdx).toBeGreaterThan(jobAssignedIdx);
    expect(skillCompletedIdx).toBeGreaterThan(skillStartIdx);
    expect(artifactIdx).toBeGreaterThan(skillCompletedIdx);

    // publish.requested must appear (from QA approval gate)
    expect(eventNames).toContain('publish.requested');
  });

  it('can simulate operator approval of the pending publish event', () => {
    processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    // Find the pending CMS publish event
    const pendingPub = publishEventStore.listAll().find(
      (e) => e.destination === 'website_cms' && e.status === 'pending',
    );
    expect(pendingPub).toBeDefined();

    // Operator approves
    const approved = publishEventStore.updateStatus(pendingPub!.id, 'approved', {
      approvedBy: 'operator:jesse',
      approvedAt: Date.now(),
    });
    expect(approved).toBeDefined();
    expect(approved!.status).toBe('approved');
    expect(approved!.approvedBy).toBe('operator:jesse');

    // Operator publishes
    const published = publishEventStore.updateStatus(pendingPub!.id, 'published', {
      externalUrl: 'https://apexroofing.example.com',
    });
    expect(published).toBeDefined();
    expect(published!.status).toBe('published');
    expect(published!.externalUrl).toBe('https://apexroofing.example.com');
  });

  it('stores workspace context on artifacts', () => {
    const result = processSignal({
      name: 'contractor_website_requested',
      payload: signalPayload,
    });

    result.artifacts.forEach((artifact) => {
      expect(artifact.workspaceId).toBe('default');
    });
  });
});
