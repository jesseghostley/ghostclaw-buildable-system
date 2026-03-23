import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillInvocationStore } from './skill_invocation';
import { assignmentStore } from './assignment';
import { eventBus } from './event_bus';
import type { Artifact } from './runtime_loop';
import { resolveTokens } from './design_tokens';

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

    // Resolve design tokens: payload override → DESIGN.md → defaults
    const t = resolveTokens(payload.designMarkdown as string | undefined);

    const builtSites = sites.map((site) => {
      const name = site.businessName || 'Contractor';
      const trade = site.trade || 'General';
      const location = site.location || '';
      const phone = site.phone || '';
      const email = site.email || '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const nav = [
        `<nav style="background:${t.colors.surface};padding:${t.layout['nav-padding']};display:flex;gap:24px;align-items:center">`,
        '<img src="logo.png" alt="' + name + ` logo" style="height:40px;width:auto;border:2px dashed ${t.colors.border};border-radius:4px;padding:2px"/>`,
        `<a href="index.html" style="color:${t.colors['nav-link']};text-decoration:none;font-weight:bold">${name}</a>`,
        `<a href="services.html" style="color:${t.colors['nav-link-secondary']};text-decoration:none">Services</a>`,
        `<a href="contact.html" style="color:${t.colors['nav-link-secondary']};text-decoration:none">Contact</a>`,
        '</nav>',
      ].join('\n');

      const footer = [
        `<footer style="background:${t.colors.surface};padding:${t.layout.padding};text-align:center;color:${t.colors['text-muted']};margin-top:${t.layout['footer-margin-top']}">`,
        `<p>&copy; ${new Date().getFullYear()} ${name}. ${trade} services in ${location}.</p>`,
        '</footer>',
      ].join('\n');

      function page(title: string, desc: string, body: string): string {
        return [
          '<!doctype html>',
          '<html lang="en">',
          '<head>',
          '<meta charset="UTF-8"/>',
          '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
          `<title>${title}</title>`,
          `<meta name="description" content="${desc}"/>`,
          '<meta property="og:image" content="og-image.jpg"/>',
          `<style>body{font-family:${t.typography['font-family']};margin:0;color:${t.colors.text};background:${t.colors.background}}`,
          `main{max-width:${t.layout['max-width']};margin:0 auto;padding:${t.layout.padding}}h1{margin:0 0 16px}p{line-height:${t.typography['line-height']}}`,
          `.img-placeholder{border:2px dashed ${t.colors.border};border-radius:8px;display:flex;align-items:center;`,
          `justify-content:center;color:${t.colors['placeholder-text']};font-size:14px;background:${t.colors.surface}}</style>`,
          '</head>',
          '<body>',
          nav,
          '<main>',
          body,
          '</main>',
          footer,
          '</body>',
          '</html>',
        ].join('\n');
      }

      const indexTitle = `${name} \u2013 ${trade} in ${location}`;
      const indexDesc = `${name} provides professional ${trade} services in ${location}.`;
      const indexBody = [
        '<div class="img-placeholder" style="width:100%;height:300px;margin-bottom:24px">',
        `<img src="hero.jpg" alt="${name} hero" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display=&apos;none&apos;;this.parentNode.textContent=&apos;[ hero.jpg — 1200x600 recommended ]&apos;"/>`,
        '</div>',
        `<h1>${name}</h1>`,
        `<p>Professional ${trade} services in ${location}.</p>`,
        `<p>${name} delivers reliable, high-quality ${trade} solutions for residential and commercial clients.</p>`,
        `<p><a href="services.html" style="color:${t.colors.link}">View our services &rarr;</a></p>`,
        `<p><a href="contact.html" style="color:${t.colors.link}">Get in touch &rarr;</a></p>`,
      ].join('\n');

      const servicesTitle = `Services \u2013 ${name}`;
      const servicesDesc = `Professional ${trade} services offered by ${name} in ${location}.`;
      const servicesBody = [
        `<h1>${trade.charAt(0).toUpperCase() + trade.slice(1)} Services</h1>`,
        `<p>${name} offers a full range of ${trade} services in the ${location} area:</p>`,
        '<ul>',
        `<li>Residential ${trade}</li>`,
        `<li>Commercial ${trade}</li>`,
        `<li>Emergency ${trade} repair</li>`,
        `<li>${trade.charAt(0).toUpperCase() + trade.slice(1)} installation &amp; maintenance</li>`,
        '</ul>',
        `<p><a href="contact.html" style="color:${t.colors.link}">Request a quote &rarr;</a></p>`,
      ].join('\n');

      const contactTitle = `Contact \u2013 ${name}`;
      const contactDesc = `Contact ${name} for ${trade} services in ${location}.`;
      const contactBody = [
        '<h1>Contact Us</h1>',
        `<p>Reach out to ${name} for ${trade} services in ${location}.</p>`,
        phone ? `<p><strong>Phone:</strong> ${phone}</p>` : '',
        email ? `<p><strong>Email:</strong> <a href="mailto:${email}" style="color:${t.colors.link}">${email}</a></p>` : '',
        location ? `<p><strong>Location:</strong> ${location}</p>` : '',
      ].filter(Boolean).join('\n');

      return {
        slug,
        businessName: name,
        manifest: {
          version: '1.0',
          generatedAt: new Date().toISOString(),
          slug,
          businessName: name,
          trade,
          location,
          pages: ['index.html', 'services.html', 'contact.html'],
          assets: {
            'logo.png': { status: 'placeholder', note: 'Replace with business logo (recommended 300x100)' },
            'hero.jpg': { status: 'placeholder', note: 'Replace with hero/banner image (recommended 1200x600)' },
            'og-image.jpg': { status: 'placeholder', note: 'Social sharing image (recommended 1200x630)' },
          },
          content: {
            tagline: { status: 'placeholder', value: `Professional ${trade} services`, note: 'Replace with business tagline' },
            aboutText: { status: 'placeholder', value: '', note: 'Add 2-3 sentences about the business' },
            serviceList: { status: 'auto-generated', note: 'Review and customize service descriptions' },
            testimonials: { status: 'placeholder', value: [], note: 'Add customer testimonials (name, quote, rating)' },
          },
          schema: 'schema.json',
          status: 'draft',
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
        files: {
          'manifest.json': '', // populated below
          'schema.json': '', // populated below
          'index.html': page(indexTitle, indexDesc, indexBody),
          'services.html': page(servicesTitle, servicesDesc, servicesBody),
          'contact.html': page(contactTitle, contactDesc, contactBody),
        },
        meta: {
          index: { title: indexTitle, description: indexDesc },
          services: { title: servicesTitle, description: servicesDesc },
          contact: { title: contactTitle, description: contactDesc },
        },
      };
    });

    // Populate self-referencing JSON files after structure is built
    builtSites.forEach((s) => {
      s.files['manifest.json'] = JSON.stringify(s.manifest, null, 2);
      s.files['schema.json'] = JSON.stringify(s.schema, null, 2);
    });

    return { siteCount: builtSites.length, sites: builtSites, handoffReady: true };
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
