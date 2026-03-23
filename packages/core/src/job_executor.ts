import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillInvocationStore } from './skill_invocation';
import { assignmentStore } from './assignment';
import { eventBus } from './event_bus';
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
  build_site_page: (inputPayload) => {
    const payload = (inputPayload.signalPayload ?? {}) as Record<string, unknown>;
    const sites = (Array.isArray(payload.sites) ? payload.sites : [payload]) as Array<
      Record<string, string>
    >;
    const pages = sites.map((site) => {
      const name = site.businessName || 'Contractor';
      const trade = site.trade || 'General';
      const location = site.location || '';
      const phone = site.phone || '';
      const email = site.email || '';
      return {
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title: `${name} – ${trade} in ${location}`,
        meta: {
          description: `${name} provides professional ${trade} services in ${location}.`,
          keywords: [trade, location, name].filter(Boolean),
        },
        schema: {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name,
          description: `Professional ${trade} services`,
          address: { '@type': 'PostalAddress', addressLocality: location },
          ...(phone && { telephone: phone }),
          ...(email && { email }),
        },
        html: [
          '<!doctype html>',
          '<html lang="en"><head>',
          '<meta charset="UTF-8"/>',
          `<title>${name} \u2013 ${trade} in ${location}</title>`,
          `<meta name="description" content="${name} provides professional ${trade} services in ${location}."/>`,
          '</head><body>',
          `<h1>${name}</h1>`,
          `<p>${trade} services in ${location}</p>`,
          phone ? `<p>Phone: ${phone}</p>` : '',
          email ? `<p>Email: ${email}</p>` : '',
          '</body></html>',
        ]
          .filter(Boolean)
          .join('\n'),
      };
    });
    return { siteCount: pages.length, pages, handoffReady: true };
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

      artifacts.push({
        id: artifactId,
        jobId: job.id,
        skillInvocationId: invocationId,
        type: job.jobType,
        content: JSON.stringify(outputPayload),
        createdAt: completedAt,
      });
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
