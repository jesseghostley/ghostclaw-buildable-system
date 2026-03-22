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

describe('PublishEvent idempotency guard', () => {
  it('creates exactly one pending (approval-gated) PublishEvent per contractor site', () => {
    processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Acme Roofing',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    // Pipeline produces 3 artifacts: design_site_structure, generate_page_content,
    // review_and_approve.  Only review_and_approve has requiresApproval=true.
    // - 2 non-approval artifacts get auto-published by the subscriber (status=published)
    // - 1 approval-gated artifact gets a pending PublishEvent from job_executor
    // The approval-gated artifact must NOT also get an auto-published event.
    const allPubEvents = publishEventStore.listAll();
    const pending = allPubEvents.filter((pe) => pe.status === 'pending');
    const published = allPubEvents.filter((pe) => pe.status === 'published');

    expect(pending).toHaveLength(1);
    expect(published).toHaveLength(2);
    // Total: 3 PublishEvents, not 4
    expect(allPubEvents).toHaveLength(3);
  });

  it('does not create a duplicate PublishEvent for an approval-gated artifact', () => {
    processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Acme Roofing',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    const allPubEvents = publishEventStore.listAll();
    // 3 artifacts → 3 PublishEvents (2 auto-published + 1 pending approval)
    expect(allPubEvents).toHaveLength(3);

    // The approval-gated artifact (review_and_approve) should have exactly
    // ONE PublishEvent (pending), not two
    const pendingEvent = allPubEvents.find((pe) => pe.status === 'pending')!;
    const eventsForApprovalArtifact = publishEventStore.listByArtifactId(pendingEvent.artifactId);
    expect(eventsForApprovalArtifact).toHaveLength(1);
    expect(eventsForApprovalArtifact[0].status).toBe('pending');
  });

  it('allows a new PublishEvent if prior ones are rejected or failed', () => {
    processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Acme Roofing',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    const pendingEvent = publishEventStore.listByStatus('pending')[0];
    expect(pendingEvent).toBeDefined();

    // Reject the pending event
    publishEventStore.updateStatus(pendingEvent.id, 'rejected', {
      failureReason: 'Content not ready',
    });

    // Guard should now allow a new event for this artifact
    const existing = publishEventStore.listByArtifactId(pendingEvent.artifactId);
    const alreadyHasActive = existing.some(
      (pe) => pe.status === 'pending' || pe.status === 'approved',
    );
    expect(alreadyHasActive).toBe(false);
  });

  it('batch of two sites creates exactly two pending (approval-gated) PublishEvents', () => {
    processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Acme Roofing',
        trade: 'roofing',
        location: 'Denver, CO',
      },
    });

    processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Best Plumbing',
        trade: 'plumbing',
        location: 'Austin, TX',
      },
    });

    const allPubEvents = publishEventStore.listAll();
    // 2 sites × 3 artifacts = 6 artifacts
    // 2 sites × (2 auto-published + 1 pending) = 6 total PublishEvents
    expect(allPubEvents).toHaveLength(6);

    const pending = allPubEvents.filter((pe) => pe.status === 'pending');
    expect(pending).toHaveLength(2);

    // Each pending event should reference a different artifact
    const pendingArtifactIds = pending.map((pe) => pe.artifactId);
    expect(new Set(pendingArtifactIds).size).toBe(2);
  });
});
