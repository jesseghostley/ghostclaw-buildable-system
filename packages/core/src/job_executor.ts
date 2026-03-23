import { agentRegistry } from './agent_registry';
import { jobQueue } from './job_queue';
import { skillInvocationStore } from './skill_invocation';
import { assignmentStore } from './assignment';
import { eventBus } from './event_bus';
import type { Artifact } from './runtime_loop';
import { resolveTokens } from './design_tokens';

/** If token is just a color, prepend '1px solid'; if already a full shorthand, use as-is. */
function borderVal(v: string): string {
  return v.includes(' ') ? v : `1px solid ${v}`;
}

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
          `justify-content:center;color:${t.colors['placeholder-text']};font-size:14px;background:${t.colors.surface}}`,
          `.cta-button{display:inline-block;background:${t.buttons.background};color:${t.buttons.text};padding:${t.buttons.padding};border-radius:${t.buttons['border-radius']};font-weight:${t.buttons['font-weight']};text-decoration:none}`,
          `.cta-button:hover{background:${t.buttons['hover-background']}}`,
          `.cta-button-secondary{display:inline-block;background:${t.buttons['secondary-background']};color:${t.buttons['secondary-text']};padding:${t.buttons.padding};border-radius:${t.buttons['border-radius']};font-weight:${t.buttons['font-weight']};text-decoration:none;border:${borderVal(t.buttons['secondary-border'])}}`,
          `.cta-button-secondary:hover{background:${t.buttons['secondary-background']};opacity:0.8}`,
          `.card{background:${t.cards.background};border:${borderVal(t.cards.border)};border-radius:${t.cards['border-radius']};padding:${t.cards.padding}}`,
          `.form-group{margin-bottom:12px}.form-group label{display:block;margin-bottom:4px;color:${t.forms['label-color']};font-size:14px}`,
          `.form-group input,.form-group textarea{width:100%;box-sizing:border-box;background:${t.forms['input-background']};border:${borderVal(t.forms['input-border'])};color:${t.forms['input-text']};border-radius:${t.forms['input-radius']};padding:${t.forms['input-padding']};font-family:inherit}</style>`,
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
        `<p><a href="services.html" class="cta-button">View our services &rarr;</a></p>`,
        `<p><a href="contact.html" class="cta-button-secondary">Get in touch &rarr;</a></p>`,
      ].join('\n');

      const servicesTitle = `Services \u2013 ${name}`;
      const servicesDesc = `Professional ${trade} services offered by ${name} in ${location}.`;
      const capTrade = trade.charAt(0).toUpperCase() + trade.slice(1);
      const servicesBody = [
        `<h1>${capTrade} Services</h1>`,
        `<p>${name} offers a full range of ${trade} services in the ${location} area:</p>`,
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0">',
        `<div class="card"><strong>Residential ${capTrade}</strong><p style="margin:8px 0 0;font-size:14px">Full-service residential ${trade} for homes of all sizes.</p></div>`,
        `<div class="card"><strong>Commercial ${capTrade}</strong><p style="margin:8px 0 0;font-size:14px">Professional ${trade} solutions for businesses.</p></div>`,
        `<div class="card"><strong>Emergency Repair</strong><p style="margin:8px 0 0;font-size:14px">24/7 emergency ${trade} repair services.</p></div>`,
        `<div class="card"><strong>Installation &amp; Maintenance</strong><p style="margin:8px 0 0;font-size:14px">${capTrade} installation and ongoing maintenance.</p></div>`,
        '</div>',
        `<p><a href="contact.html" class="cta-button">Request a quote &rarr;</a></p>`,
      ].join('\n');

      const contactTitle = `Contact \u2013 ${name}`;
      const contactDesc = `Contact ${name} for ${trade} services in ${location}.`;
      const contactBody = [
        '<h1>Contact Us</h1>',
        `<p>Reach out to ${name} for ${trade} services in ${location}.</p>`,
        phone ? `<p><strong>Phone:</strong> ${phone}</p>` : '',
        email ? `<p><strong>Email:</strong> <a href="mailto:${email}" class="cta-button-secondary">${email}</a></p>` : '',
        location ? `<p><strong>Location:</strong> ${location}</p>` : '',
        `<form action="mailto:${email || 'contact@example.com'}" method="POST" enctype="text/plain" style="margin-top:24px">`,
        '<div class="form-group"><label for="name">Name</label><input type="text" id="name" name="name" required/></div>',
        '<div class="form-group"><label for="email">Email</label><input type="email" id="email" name="email" required/></div>',
        '<div class="form-group"><label for="message">Message</label><textarea id="message" name="message" rows="4" required></textarea></div>',
        '<button type="submit" class="cta-button" style="border:none;cursor:pointer">Send Message</button>',
        '</form>',
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
        } as Record<string, string>,
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

      // Generate HANDOFF.md for finishing agents
      const handoff = [
        `# ${s.businessName} — Handoff`,
        '',
        `**Slug:** ${s.slug}`,
        `**Trade:** ${s.manifest.trade}`,
        `**Location:** ${s.manifest.location}`,
        `**Status:** ${s.manifest.status}`,
        `**Generated:** ${s.manifest.generatedAt}`,
        '',
        '## Files',
        ...s.manifest.pages.map((p: string) => `- ${p}`),
        '- manifest.json',
        '- schema.json',
        '',
        '## Placeholder Assets (replace before publish)',
        ...Object.entries(s.manifest.assets).map(
          ([file, info]: [string, unknown]) => `- **${file}** — ${(info as Record<string, string>).note}`,
        ),
        '',
        '## Placeholder Content (review before publish)',
        ...Object.entries(s.manifest.content).map(
          ([key, info]: [string, unknown]) => `- **${key}** (${(info as Record<string, string>).status}) — ${(info as Record<string, string>).note}`,
        ),
        '',
        '## Deploy to cPanel',
        `1. Upload the \`${s.slug}/\` folder contents to \`public_html/\``,
        '2. Replace placeholder assets listed above',
        '3. Review and customize placeholder content',
        '4. Verify schema.json with Google Rich Results Test',
        '5. Set status to "live" in manifest.json',
        '',
      ].join('\n');
      s.files['HANDOFF.md'] = handoff;

      // Re-key files under slug/ prefix for clean package structure
      const prefixed: Record<string, string> = {};
      for (const [filename, content] of Object.entries(s.files)) {
        prefixed[`${s.slug}/${filename}`] = content as string;
      }
      s.files = prefixed;
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
