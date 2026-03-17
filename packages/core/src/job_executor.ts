import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillInvocationStore } from './skill_invocation';
import { assignmentStore } from './assignment';
import { eventBus } from './event_bus';
import { publishEventStore } from './publish_event';
import { auditLog } from './audit_log';
import type { Artifact } from './runtime_loop';

export type JobHandler = (inputPayload: Record<string, unknown>) => Record<string, unknown>;

const JOB_HANDLERS: Record<string, JobHandler> = {
  draft_cluster_outline: (inputPayload) => ({
    result: `Cluster outline generated for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  refresh_page_sections: (inputPayload) => ({
    result: `Page sections refreshed for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  scaffold_skill_package: (inputPayload) => ({
    result: `Skill package scaffolded for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),
  run_diagnostics: (inputPayload) => ({
    result: `Diagnostics run for ${String(inputPayload.signalName ?? 'unknown_signal')}`,
  }),

  // Contractor Website Factory skills
  design_site_structure: (inputPayload) => {
    const payload = inputPayload.signalPayload as Record<string, unknown> | null;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    const trade = String(payload?.trade ?? 'general');
    return {
      result: `Site structure designed for ${businessName}`,
      siteStructure: {
        businessName,
        trade,
        pages: ['home', 'services', 'about', 'gallery', 'contact'],
        sections: {
          home: ['hero', 'services_overview', 'testimonials', 'cta'],
          services: ['service_list', 'pricing', 'faq'],
          about: ['story', 'team', 'certifications'],
          gallery: ['project_gallery', 'before_after'],
          contact: ['form', 'map', 'hours'],
        },
      },
    };
  },

  generate_page_content: (inputPayload) => {
    const payload = inputPayload.signalPayload as Record<string, unknown> | null;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    const trade = String(payload?.trade ?? 'general');
    const location = String(payload?.location ?? 'your area');
    return {
      result: `Page content generated for ${businessName}`,
      pageContent: {
        home: {
          title: `${businessName} — Professional ${trade} Services in ${location}`,
          hero: `Trusted ${trade} contractor serving ${location} with quality workmanship and reliable service.`,
          cta: 'Get Your Free Estimate Today',
        },
        services: {
          title: `Our ${trade} Services`,
          description: `Full-service ${trade} solutions for residential and commercial properties in ${location}.`,
        },
        contact: {
          title: 'Contact Us',
          description: `Ready to start your ${trade} project? Get in touch for a free consultation.`,
        },
      },
    };
  },

  review_and_approve: (inputPayload) => {
    const payload = inputPayload.signalPayload as Record<string, unknown> | null;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    return {
      result: `QA review completed for ${businessName}`,
      qaReport: {
        businessName,
        checksPerformed: [
          'site_structure_completeness',
          'content_quality',
          'seo_metadata_present',
          'contact_info_present',
          'mobile_responsive_flag',
        ],
        passed: true,
        requiresApproval: true,
        approvalReason: 'New contractor website ready for publishing — requires operator review.',
      },
    };
  },
};

export function executeJobs(): Artifact[] {
  const artifacts: Artifact[] = [];

  while (true) {
    const job = jobQueue.dequeue();
    if (!job) {
      break;
    }

    const assignedAgent = agentRegistry.findAgentForJob(job.jobType);
    if (!assignedAgent) {
      jobQueue.markFailed(job.id);
      continue;
    }

    job.assignedAgent = assignedAgent.agentName;
    job.updatedAt = Date.now();
    jobQueue.markRunning(job.id);

    eventBus.emit('job.assigned', { ...job, agentName: assignedAgent.agentName });

    // Create a first-class Assignment record for this job-to-agent binding.
    const assignmentId = `assign_${job.id}`;
    assignmentStore.create({
      id: assignmentId,
      jobId: job.id,
      agentName: assignedAgent.agentName,
      reason: `Agent selected by capability match for job type '${job.jobType}'.`,
      createdAt: Date.now(),
    });

    const handler = JOB_HANDLERS[job.jobType];
    if (!handler) {
      jobQueue.markFailed(job.id);
      continue;
    }

    const invocationId = `inv_${job.id}`;

    const invocation = skillInvocationStore.create({
      id: invocationId,
      workspaceId: 'default',
      planId: job.planId,
      jobId: job.id,
      assignmentId,
      agentId: assignedAgent.agentName,
      skillId: job.jobType,
      status: 'pending',
      inputPayload: job.inputPayload,
      outputPayload: null,
      artifactIds: [],
      error: null,
      retryCount: job.retryCount,
      fallbackUsed: false,
      startedAt: Date.now(),
      completedAt: null,
    });

    skillInvocationStore.updateStatus(invocationId, 'running');
    eventBus.emit('skill.invocation.started', invocation);

    try {
      const outputPayload = handler(job.inputPayload);
      job.outputPayload = outputPayload;
      job.updatedAt = Date.now();
      jobQueue.markComplete(job.id);

      const artifactId = `artifact_${job.id}`;
      const completedAt = Date.now();

      skillInvocationStore.updateStatus(invocationId, 'completed', {
        outputPayload,
        artifactIds: [artifactId],
        completedAt,
      });
      eventBus.emit('skill.invocation.completed', skillInvocationStore.getById(invocationId)!);

      const artifact: Artifact = {
        id: artifactId,
        jobId: job.id,
        skillInvocationId: invocationId,
        type: job.jobType,
        content: JSON.stringify(outputPayload),
        createdAt: completedAt,
        workspaceId: 'default',
      };
      artifacts.push(artifact);

      // Audit: log job completion
      auditLog.append({
        id: `audit_${job.id}_completed`,
        eventType: 'job.completed',
        objectType: 'Job',
        objectId: job.id,
        actorId: assignedAgent.agentName,
        timestamp: completedAt,
        summary: `${assignedAgent.agentName} completed ${job.jobType}`,
        workspaceId: 'default',
      });
      eventBus.emit('audit.logged', auditLog.listAll().at(-1)!);

      // Approval gate: if the QA review says approval is required, create a
      // pending PublishEvent so an operator must approve before publishing.
      const qaReport = outputPayload.qaReport as Record<string, unknown> | undefined;
      if (qaReport?.requiresApproval) {
        const publishId = `pub_${artifactId}`;
        const pubEvent = publishEventStore.create({
          id: publishId,
          artifactId,
          publishedAt: completedAt,
          destination: 'website_cms',
          status: 'pending',
          publishedBy: assignedAgent.agentName,
        });
        eventBus.emit('publish.requested', pubEvent);

        auditLog.append({
          id: `audit_${publishId}_initiated`,
          eventType: 'publish_event.initiated',
          objectType: 'PublishEvent',
          objectId: publishId,
          actorId: assignedAgent.agentName,
          timestamp: Date.now(),
          summary: `Publishing approval requested for ${String(qaReport.businessName ?? 'contractor')} website — awaiting operator review.`,
          workspaceId: 'default',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[SkillInvocation] Invocation ${invocationId} failed for job ${job.id}:`, errorMessage);

      const retryCount = job.retryCount + 1;
      skillInvocationStore.updateStatus(invocationId, 'failed', {
        error: errorMessage,
        retryCount,
        completedAt: Date.now(),
      });

      console.warn(`[SkillInvocation] Retry attempt ${retryCount} for job ${job.id} (skill: ${job.jobType})`);
      jobQueue.markFailed(job.id);
      eventBus.emit('skill.invocation.failed', skillInvocationStore.getById(invocationId)!);
    }
  }

  return artifacts;
}
