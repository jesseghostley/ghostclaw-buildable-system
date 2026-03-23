import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { parseDesignMarkdown, resolveTokens, DEFAULT_TOKENS } from '../packages/core/src/design_tokens';

// Reset all module-level singletons before each test to avoid cross-test contamination.
beforeEach(() => {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
  assignmentStore.reset();
});

describe('processSignal', () => {
  it('creates a signal, plan, jobs and artifacts for keyword_opportunity_detected', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected', payload: { topic: 'AI' } });

    expect(result.signal.name).toBe('keyword_opportunity_detected');
    expect(result.plan.action).toBe('generate_content_cluster');
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].jobType).toBe('draft_cluster_outline');
    expect(result.jobs[0].status).toBe('completed');
    expect(result.artifacts).toHaveLength(1);
    expect(result.skillInvocations).toHaveLength(1);
    expect(result.skillInvocations[0].skillId).toBe('draft_cluster_outline');
    expect(result.skillInvocations[0].status).toBe('completed');
  });

  it('handles runtime_error_detected end-to-end', () => {
    const result = processSignal({ name: 'runtime_error_detected' });

    expect(result.plan.action).toBe('handle_runtime_error');
    expect(result.jobs[0].jobType).toBe('run_diagnostics');
    expect(result.jobs[0].assignedAgent).toBe('DiagnosticsAgent');
    expect(result.jobs[0].status).toBe('completed');
    expect(result.skillInvocations[0].agentId).toBe('DiagnosticsAgent');
  });

  it('handles marketplace_gap_detected end-to-end', () => {
    const result = processSignal({ name: 'marketplace_gap_detected' });

    expect(result.plan.action).toBe('create_new_skill');
    expect(result.jobs[0].jobType).toBe('scaffold_skill_package');
    expect(result.jobs[0].status).toBe('completed');
  });

  it('handles ranking_loss_detected end-to-end', () => {
    const result = processSignal({ name: 'ranking_loss_detected' });

    expect(result.plan.action).toBe('optimize_existing_page');
    expect(result.jobs[0].jobType).toBe('refresh_page_sections');
    expect(result.jobs[0].status).toBe('completed');
  });

  it('handles contractor_site_requested end-to-end with real site output', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Summit HVAC', trade: 'hvac', location: 'Denver, CO', phone: '303-555-1234', email: 'info@summithvac.com' },
        ],
      },
    });

    expect(result.plan.action).toBe('build_contractor_site');
    expect(result.jobs[0].jobType).toBe('build_site_page');
    expect(result.jobs[0].assignedAgent).toBe('WebsiteBuilderAgent');
    expect(result.jobs[0].status).toBe('completed');
    expect(result.artifacts).toHaveLength(1);

    const content = JSON.parse(result.artifacts[0].content);
    expect(content.handoffReady).toBe(true);
    expect(content.siteCount).toBe(1);

    const site = content.sites[0];
    expect(site.slug).toBe('summit-hvac');
    expect(site.businessName).toBe('Summit HVAC');
    expect(site.schema['@type']).toBe('LocalBusiness');
    expect(site.schema.telephone).toBe('303-555-1234');

    // 6 files: 3 HTML + manifest.json + schema.json + HANDOFF.md, all under slug/
    const s = 'summit-hvac';
    expect(Object.keys(site.files)).toEqual([
      `${s}/manifest.json`, `${s}/schema.json`, `${s}/index.html`, `${s}/services.html`, `${s}/contact.html`, `${s}/HANDOFF.md`,
    ]);

    // Manifest structure
    expect(site.manifest.version).toBe('1.0');
    expect(site.manifest.slug).toBe('summit-hvac');
    expect(site.manifest.trade).toBe('hvac');
    expect(site.manifest.pages).toEqual(['index.html', 'services.html', 'contact.html']);
    expect(site.manifest.status).toBe('draft');
    expect(site.manifest.zipFilename).toBe('summit-hvac.zip');
    expect(site.manifest.assets['logo.png'].status).toBe('placeholder');
    expect(site.manifest.assets['hero.jpg'].status).toBe('placeholder');
    expect(site.manifest.content.tagline.status).toBe('placeholder');
    expect(site.manifest.content.testimonials.status).toBe('placeholder');
    expect(site.manifest.generatedAt).toBeDefined();

    // manifest.json and schema.json are valid JSON strings in files
    expect(JSON.parse(site.files[`${s}/manifest.json`]).slug).toBe('summit-hvac');
    expect(JSON.parse(site.files[`${s}/schema.json`])['@type']).toBe('LocalBusiness');

    // Shared nav present in all HTML pages
    expect(site.files[`${s}/index.html`]).toContain('<nav');
    expect(site.files[`${s}/services.html`]).toContain('<nav');
    expect(site.files[`${s}/contact.html`]).toContain('<nav');

    // Shared footer present in all HTML pages
    expect(site.files[`${s}/index.html`]).toContain('<footer');
    expect(site.files[`${s}/services.html`]).toContain('<footer');
    expect(site.files[`${s}/contact.html`]).toContain('<footer');

    // Image placeholders
    expect(site.files[`${s}/index.html`]).toContain('src="logo.png"');
    expect(site.files[`${s}/services.html`]).toContain('src="logo.png"');
    expect(site.files[`${s}/contact.html`]).toContain('src="logo.png"');
    expect(site.files[`${s}/index.html`]).toContain('src="hero.jpg"');
    expect(site.files[`${s}/index.html`]).toContain('og:image');
    expect(site.files[`${s}/services.html`]).toContain('og:image');
    expect(site.files[`${s}/contact.html`]).toContain('og:image');
    expect(site.files[`${s}/index.html`]).toContain('img-placeholder');

    // Page-specific content
    expect(site.files[`${s}/index.html`]).toContain('Summit HVAC');
    expect(site.files[`${s}/services.html`]).toContain('Hvac Services');
    expect(site.files[`${s}/contact.html`]).toContain('303-555-1234');
    expect(site.files[`${s}/contact.html`]).toContain('info@summithvac.com');

    // Service cards present on services page
    expect(site.files[`${s}/services.html`]).toContain('class="card"');

    // FAQ section on services page (trade-specific for hvac)
    expect(site.files[`${s}/services.html`]).toContain('Frequently Asked Questions');
    expect(site.files[`${s}/services.html`]).toContain('How much does HVAC service cost in Denver, CO?');

    // Testimonials on index page
    expect(site.files[`${s}/index.html`]).toContain('What Our Clients Say');
    expect(site.files[`${s}/index.html`]).toContain('satisfied client in Denver, CO');

    // Service area on index page
    expect(site.files[`${s}/index.html`]).toContain('Serving Denver, CO');

    // Service area on contact page
    expect(site.files[`${s}/contact.html`]).toContain('Service Area');

    // Contact form present on contact page
    expect(site.files[`${s}/contact.html`]).toContain('<form');
    expect(site.files[`${s}/contact.html`]).toContain('class="form-group"');

    // HANDOFF.md present and contains key info
    expect(site.files[`${s}/HANDOFF.md`]).toContain('# Summit HVAC');
    expect(site.files[`${s}/HANDOFF.md`]).toContain('**Slug:** summit-hvac');
    expect(site.files[`${s}/HANDOFF.md`]).toContain('## Placeholder Assets');
    expect(site.files[`${s}/HANDOFF.md`]).toContain('## Deploy to cPanel');
    expect(site.files[`${s}/HANDOFF.md`]).toContain('summit-hvac.zip');
    expect(site.files[`${s}/HANDOFF.md`]).toContain('public_html/');

    // Per-page meta
    expect(site.meta.index.title).toContain('Summit HVAC');
    expect(site.meta.services.title).toContain('Services');
    expect(site.meta.contact.title).toContain('Contact');
  });

  it('throws for an unknown signal name', () => {
    expect(() => processSignal({ name: 'not_a_real_signal' })).toThrow(
      'Unsupported signal name: not_a_real_signal',
    );
  });

  it('increments runtimeStore counts on each call', () => {
    processSignal({ name: 'keyword_opportunity_detected' });
    processSignal({ name: 'runtime_error_detected' });

    expect(runtimeStore.signals).toHaveLength(2);
    expect(runtimeStore.plans).toHaveLength(2);
    expect(runtimeStore.artifacts).toHaveLength(2);
    expect(runtimeStore.skillInvocations).toHaveLength(2);
    expect(runtimeStore.assignments).toHaveLength(2);
  });

  it('populates runtimeStore.skillInvocations', () => {
    processSignal({ name: 'ranking_loss_detected' });
    expect(runtimeStore.skillInvocations).toHaveLength(1);
    expect(runtimeStore.skillInvocations[0].skillId).toBe('refresh_page_sections');
  });

  it('links artifact skillInvocationId to the invocation', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected' });
    const artifact = result.artifacts[0];
    const invocation = result.skillInvocations[0];
    expect(artifact.skillInvocationId).toBe(invocation.id);
  });

  it('creates an Assignment for each executed job', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected' });

    expect(result.assignments).toHaveLength(1);
    const assignment = result.assignments[0];
    expect(assignment.jobId).toBe(result.jobs[0].id);
    expect(assignment.agentName).toBe(result.jobs[0].assignedAgent);
    expect(assignment.id).toBe(`assign_${result.jobs[0].id}`);
  });

  it('links SkillInvocation.assignmentId to the Assignment record', () => {
    const result = processSignal({ name: 'ranking_loss_detected' });

    const assignment = result.assignments[0];
    const invocation = result.skillInvocations[0];
    expect(invocation.assignmentId).toBe(assignment.id);
  });

  it('stores Plan optional fields sourced from PlannerDecision', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected' });

    expect(result.plan.priority).toBeDefined();
    expect(Array.isArray(result.plan.requiredAgents)).toBe(true);
    expect(Array.isArray(result.plan.expectedOutputs)).toBe(true);
  });

  it('populates runtimeStore.assignments', () => {
    processSignal({ name: 'runtime_error_detected' });
    expect(runtimeStore.assignments).toHaveLength(1);
    expect(runtimeStore.assignments[0].agentName).toBe('DiagnosticsAgent');
  });

  it('applies design token overrides from payload.designMarkdown', () => {
    const customDesign = [
      '## colors',
      '- background: #ffffff',
      '- text: #111827',
      '## buttons',
      '- background: #dc2626',
      '- text: #fff000',
    ].join('\n');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        designMarkdown: customDesign,
        sites: [
          { businessName: 'Bright Plumbing', trade: 'plumbing', location: 'Austin, TX' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const html = content.sites[0].files['bright-plumbing/index.html'];

    // Overridden color tokens appear in the generated HTML
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('color:#111827');

    // Overridden button tokens appear in the CTA styles
    expect(html).toContain('background:#dc2626');
    expect(html).toContain('color:#fff000');

    // Non-overridden tokens keep defaults
    expect(html).toContain(DEFAULT_TOKENS.colors.surface);
    expect(html).toContain(DEFAULT_TOKENS.colors.border);
  });

  it('uses default tokens when no designMarkdown is provided', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Default Co', trade: 'roofing', location: 'Portland, OR' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const html = content.sites[0].files['default-co/index.html'];

    expect(html).toContain(`background:${DEFAULT_TOKENS.colors.background}`);
    expect(html).toContain(`color:${DEFAULT_TOKENS.colors.text}`);
    expect(html).toContain(`background:${DEFAULT_TOKENS.buttons.background}`);
    expect(html).toContain(`color:${DEFAULT_TOKENS.buttons.text}`);
  });
});

describe('parseDesignMarkdown', () => {
  it('parses section headers and key-value pairs', () => {
    const md = [
      '# Design Tokens',
      'Some prose to ignore.',
      '',
      '## colors',
      '- background: #fff',
      '- text: #000',
      '',
      '## typography',
      '- font-family: Georgia, serif',
    ].join('\n');

    const result = parseDesignMarkdown(md);
    expect(result.colors.background).toBe('#fff');
    expect(result.colors.text).toBe('#000');
    expect(result.typography['font-family']).toBe('Georgia, serif');
  });

  it('returns empty object for empty input', () => {
    expect(parseDesignMarkdown('')).toEqual({});
  });

  it('ignores lines without proper format', () => {
    const md = [
      '## colors',
      'not a token line',
      '- valid: #aaa',
      '  - indented: #bbb',
    ].join('\n');

    const result = parseDesignMarkdown(md);
    expect(result.colors).toEqual({ valid: '#aaa' });
  });
});

describe('resolveTokens', () => {
  it('returns defaults when called with no argument', () => {
    const tokens = resolveTokens();
    expect(tokens).toEqual(DEFAULT_TOKENS);
  });

  it('merges overrides over defaults', () => {
    const md = '## colors\n- background: #ff0000';
    const tokens = resolveTokens(md);
    expect(tokens.colors.background).toBe('#ff0000');
    // Everything else stays default
    expect(tokens.colors.text).toBe(DEFAULT_TOKENS.colors.text);
    expect(tokens.typography).toEqual(DEFAULT_TOKENS.typography);
    expect(tokens.layout).toEqual(DEFAULT_TOKENS.layout);
    expect(tokens.buttons).toEqual(DEFAULT_TOKENS.buttons);
  });

  it('merges button overrides over defaults', () => {
    const md = '## buttons\n- background: #16a34a\n- text: #000000';
    const tokens = resolveTokens(md);
    expect(tokens.buttons.background).toBe('#16a34a');
    expect(tokens.buttons.text).toBe('#000000');
    // Non-overridden button tokens stay default
    expect(tokens.buttons['border-radius']).toBe(DEFAULT_TOKENS.buttons['border-radius']);
    expect(tokens.buttons['secondary-text']).toBe(DEFAULT_TOKENS.buttons['secondary-text']);
  });

  it('merges form token overrides over defaults', () => {
    const md = '## forms\n- input-background: #ffffff\n- label-color: #333333';
    const tokens = resolveTokens(md);
    expect(tokens.forms['input-background']).toBe('#ffffff');
    expect(tokens.forms['label-color']).toBe('#333333');
    expect(tokens.forms['input-border']).toBe(DEFAULT_TOKENS.forms['input-border']);
  });

  it('merges card token overrides over defaults', () => {
    const md = '## cards\n- background: #ffffff\n- padding: 32px';
    const tokens = resolveTokens(md);
    expect(tokens.cards.background).toBe('#ffffff');
    expect(tokens.cards.padding).toBe('32px');
    expect(tokens.cards.border).toBe(DEFAULT_TOKENS.cards.border);
  });
});

describe('CTA button classes', () => {
  it('generates cta-button and cta-button-secondary classes in HTML', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Button Co', trade: 'plumbing', location: 'NYC', email: 'info@btn.co' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const index = content.sites[0].files['button-co/index.html'];
    const services = content.sites[0].files['button-co/services.html'];
    const contact = content.sites[0].files['button-co/contact.html'];

    // Primary CTA buttons on index and services pages
    expect(index).toContain('class="cta-button"');
    expect(services).toContain('class="cta-button"');

    // Secondary CTA button on index page
    expect(index).toContain('class="cta-button-secondary"');

    // Email link uses secondary style
    expect(contact).toContain('class="cta-button-secondary"');

    // CSS class definitions present in all pages
    for (const page of [index, services, contact]) {
      expect(page).toContain('.cta-button{');
      expect(page).toContain('.cta-button-secondary{');
      expect(page).toContain('.cta-button:hover{');
    }
  });

  it('applies button token overrides to CTA styles', () => {
    const customDesign = [
      '## buttons',
      '- background: #16a34a',
      '- text: #f0fdf4',
      '- secondary-text: #22c55e',
      '- secondary-border: #22c55e',
    ].join('\n');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        designMarkdown: customDesign,
        sites: [
          { businessName: 'Green CTA', trade: 'landscaping', location: 'Portland, OR' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const html = content.sites[0].files['green-cta/index.html'];

    // Overridden primary button tokens
    expect(html).toContain('background:#16a34a');
    expect(html).toContain('color:#f0fdf4');

    // Overridden secondary button tokens
    expect(html).toContain('color:#22c55e');
    expect(html).toContain('border:1px solid #22c55e');

    // Non-overridden button tokens keep defaults
    expect(html).toContain(`border-radius:${DEFAULT_TOKENS.buttons['border-radius']}`);
    expect(html).toContain(`font-weight:${DEFAULT_TOKENS.buttons['font-weight']}`);
  });
});

describe('Form and card token integration', () => {
  it('generates tokenized form on contact page', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Form Co', trade: 'plumbing', location: 'NYC', email: 'hi@form.co' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const contact = content.sites[0].files['form-co/contact.html'];

    // Form structure
    expect(contact).toContain('<form');
    expect(contact).toContain('class="form-group"');
    expect(contact).toContain('id="name"');
    expect(contact).toContain('id="email"');
    expect(contact).toContain('id="message"');
    expect(contact).toContain('type="submit"');

    // Form CSS uses tokens
    expect(contact).toContain(`.form-group label{`);
    expect(contact).toContain(`color:${DEFAULT_TOKENS.forms['label-color']}`);
    expect(contact).toContain(`background:${DEFAULT_TOKENS.forms['input-background']}`);
    expect(contact).toContain(`border:1px solid ${DEFAULT_TOKENS.forms['input-border']}`);
    expect(contact).toContain(`border-radius:${DEFAULT_TOKENS.forms['input-radius']}`);
  });

  it('generates tokenized cards on services page', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Card Co', trade: 'roofing', location: 'LA' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const services = content.sites[0].files['card-co/services.html'];

    // Card structure
    expect(services).toContain('class="card"');
    expect(services).toContain('Residential Roofing');
    expect(services).toContain('Commercial Roofing');
    expect(services).toContain('Emergency Repair');
    expect(services).toContain('Installation &amp; Maintenance');

    // Card CSS uses tokens
    expect(services).toContain(`.card{background:${DEFAULT_TOKENS.cards.background}`);
    expect(services).toContain(`border:1px solid ${DEFAULT_TOKENS.cards.border}`);
    expect(services).toContain(`border-radius:${DEFAULT_TOKENS.cards['border-radius']}`);
    expect(services).toContain(`padding:${DEFAULT_TOKENS.cards.padding}`);
  });

  it('applies form token overrides in generated HTML', () => {
    const customDesign = [
      '## forms',
      '- input-background: #ffffff',
      '- input-border: #d1d5db',
      '- label-color: #374151',
    ].join('\n');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        designMarkdown: customDesign,
        sites: [
          { businessName: 'Custom Form', trade: 'electric', location: 'SF' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const contact = content.sites[0].files['custom-form/contact.html'];

    expect(contact).toContain('background:#ffffff');
    expect(contact).toContain('border:1px solid #d1d5db');
    expect(contact).toContain('color:#374151');
  });

  it('applies card token overrides in generated HTML', () => {
    const customDesign = [
      '## cards',
      '- background: #f9fafb',
      '- border: #e5e7eb',
      '- padding: 32px',
    ].join('\n');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        designMarkdown: customDesign,
        sites: [
          { businessName: 'Custom Card', trade: 'hvac', location: 'Denver' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const services = content.sites[0].files['custom-card/services.html'];

    expect(services).toContain('background:#f9fafb');
    expect(services).toContain('border:1px solid #e5e7eb');
    expect(services).toContain('padding:32px');
  });

  it('does not double-prepend border when token is already a full shorthand', () => {
    const customDesign = [
      '## cards',
      '- border: 2px dashed #e5e7eb',
      '## forms',
      '- input-border: 1px solid #d1d5db',
      '## buttons',
      '- secondary-border: 2px solid #dc2626',
    ].join('\n');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        designMarkdown: customDesign,
        sites: [
          { businessName: 'Border Test', trade: 'plumbing', location: 'NYC', email: 'a@b.co' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const services = content.sites[0].files['border-test/services.html'];
    const contact = content.sites[0].files['border-test/contact.html'];
    const index = content.sites[0].files['border-test/index.html'];

    // Full shorthand passed through without duplication
    expect(services).toContain('border:2px dashed #e5e7eb');
    expect(services).not.toContain('border:1px solid 2px dashed');

    expect(contact).toContain('border:1px solid #d1d5db');
    expect(contact).not.toContain('border:1px solid 1px solid');

    expect(index).toContain('border:2px solid #dc2626');
    expect(index).not.toContain('border:1px solid 2px solid');
  });
});

describe('Local SEO and conversion sections', () => {
  it('generates trade-specific FAQ for known trades', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Ace Plumbing', trade: 'plumbing', location: 'Austin, TX' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const services = content.sites[0].files['ace-plumbing/services.html'];

    expect(services).toContain('Frequently Asked Questions');
    // Plumbing-specific FAQ
    expect(services).toContain('How much does a plumber cost in Austin, TX?');
    expect(services).toContain('hidden leak');
    // Interpolated business name
    expect(services).toContain('Ace Plumbing serves Austin, TX');
  });

  it('uses generic FAQ fallback for unknown trades', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Niche Co', trade: 'welding', location: 'Portland, OR' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const services = content.sites[0].files['niche-co/services.html'];

    expect(services).toContain('Frequently Asked Questions');
    // Generic fallback with trade interpolation
    expect(services).toContain('How much do your services cost in Portland, OR?');
    expect(services).toContain('emergency welding services');
    expect(services).toContain('licensed and insured');
    expect(services).toContain('Niche Co serves Portland, OR');
  });

  it('generates testimonials section on index page', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Roof Pro', trade: 'roofing', location: 'Denver, CO' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const index = content.sites[0].files['roof-pro/index.html'];

    // Testimonials heading and cards
    expect(index).toContain('<h2>What Our Clients Say</h2>');
    expect(index).toContain('Excellent roofing work');
    expect(index).toContain('Highly recommend Roof Pro');
    expect(index).toContain('satisfied client in Denver, CO');

    // Service area section
    expect(index).toContain('<h2>Serving Denver, CO</h2>');
    expect(index).toContain('Roof Pro proudly provides');
  });

  it('generates service area section on contact page', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Spark Electric', trade: 'electric', location: 'Seattle, WA' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const contact = content.sites[0].files['spark-electric/contact.html'];

    expect(contact).toContain('<h2>Service Area</h2>');
    expect(contact).toContain('Spark Electric proudly serves Seattle, WA');
  });

  it('produces h2 heading hierarchy across all pages', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'H2 Check', trade: 'hvac', location: 'LA' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const index = content.sites[0].files['h2-check/index.html'];
    const services = content.sites[0].files['h2-check/services.html'];
    const contact = content.sites[0].files['h2-check/contact.html'];

    // Index: testimonials + service area = 2 h2s
    expect((index.match(/<h2/g) || []).length).toBe(2);
    // Services: FAQ = 1 h2
    expect((services.match(/<h2/g) || []).length).toBe(1);
    // Contact: service area = 1 h2
    expect((contact.match(/<h2/g) || []).length).toBe(1);
  });

  it('uses trade-specific FAQ for each known trade', () => {
    const knownTrades = ['hvac', 'plumbing', 'electric', 'roofing', 'landscaping'];
    for (const trade of knownTrades) {
      const result = processSignal({
        name: 'contractor_site_requested',
        payload: {
          sites: [
            { businessName: 'Test Biz', trade, location: 'City' },
          ],
        },
      });

      const content = JSON.parse(result.artifacts[0].content);
      const services = content.sites[0].files['test-biz/services.html'];

      expect(services).toContain('Frequently Asked Questions');
      // Each known trade should NOT contain the generic fallback phrasing
      expect(services).not.toContain('How much do your services cost');
    }
  });
});

describe('Batch generation', () => {
  it('generates batch manifest for multi-site run', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Alpha HVAC', trade: 'hvac', location: 'Denver, CO' },
          { businessName: 'Beta Plumbing', trade: 'plumbing', location: 'Austin, TX' },
          { businessName: 'Gamma Electric', trade: 'electric', location: 'Seattle, WA' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    expect(content.siteCount).toBe(3);

    const bm = content.batchManifest;
    expect(bm.version).toBe('1.0');
    expect(bm.generatedAt).toBeDefined();
    expect(bm.siteCount).toBe(3);
    expect(bm.sites).toHaveLength(3);

    // Each entry has expected fields
    expect(bm.sites[0].slug).toBe('alpha-hvac');
    expect(bm.sites[0].trade).toBe('hvac');
    expect(bm.sites[0].location).toBe('Denver, CO');
    expect(bm.sites[0].zipFilename).toBe('alpha-hvac.zip');
    expect(bm.sites[0].status).toBe('draft');
    expect(bm.sites[0].pages).toEqual(['index.html', 'services.html', 'contact.html']);
    expect(bm.sites[0].priority).toBe(1);

    expect(bm.sites[1].slug).toBe('beta-plumbing');
    expect(bm.sites[1].priority).toBe(1);
    expect(bm.sites[2].slug).toBe('gamma-electric');
    expect(bm.sites[2].priority).toBe(1);
  });

  it('generates batch handoff markdown', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Alpha HVAC', trade: 'hvac', location: 'Denver, CO' },
          { businessName: 'Beta Plumbing', trade: 'plumbing', location: 'Austin, TX' },
          { businessName: 'Gamma Electric', trade: 'electric', location: 'Seattle, WA' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const bh = content.batchHandoff;

    expect(bh).toContain('# Batch Handoff — 3 sites');
    expect(bh).toContain('| # | Business | Trade | Location | Zip | Status |');
    expect(bh).toContain('| 1 | Alpha HVAC | hvac | Denver, CO | alpha-hvac.zip | draft |');
    expect(bh).toContain('| 2 | Beta Plumbing | plumbing | Austin, TX | beta-plumbing.zip | draft |');
    expect(bh).toContain('| 3 | Gamma Electric | electric | Seattle, WA | gamma-electric.zip | draft |');
    expect(bh).toContain('## Per-site handoff');
    expect(bh).toContain('## Quick deploy');
    expect(bh).toContain('BATCH_MANIFEST.json');
  });

  it('each site gets independent zip', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Zip A', trade: 'hvac', location: 'LA' },
          { businessName: 'Zip B', trade: 'plumbing', location: 'NYC' },
          { businessName: 'Zip C', trade: 'roofing', location: 'SF' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const filenames = content.sites.map((s: Record<string, unknown>) => s.zipFilename);
    const bases = content.sites.map((s: Record<string, unknown>) => s.zipBase64);

    // All zip filenames are distinct
    expect(new Set(filenames).size).toBe(3);
    expect(filenames).toEqual(['zip-a.zip', 'zip-b.zip', 'zip-c.zip']);

    // All zip buffers are distinct and valid
    for (const b64 of bases) {
      expect(typeof b64).toBe('string');
      const buf = Buffer.from(b64 as string, 'base64');
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);
    }
  });

  it('deduplicates identical slugs', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Same Name', trade: 'hvac', location: 'LA' },
          { businessName: 'Same Name', trade: 'plumbing', location: 'NYC' },
          { businessName: 'Same Name', trade: 'roofing', location: 'SF' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const slugs = content.sites.map((s: Record<string, unknown>) => s.slug);
    expect(slugs).toEqual(['same-name', 'same-name-2', 'same-name-3']);

    // Each has its own zip filename
    const zips = content.sites.map((s: Record<string, unknown>) => s.zipFilename);
    expect(zips).toEqual(['same-name.zip', 'same-name-2.zip', 'same-name-3.zip']);

    // File keys are correctly prefixed per deduped slug
    expect(Object.keys(content.sites[0].files)[0]).toMatch(/^same-name\//);
    expect(Object.keys(content.sites[1].files)[0]).toMatch(/^same-name-2\//);
    expect(Object.keys(content.sites[2].files)[0]).toMatch(/^same-name-3\//);

    // Batch manifest reflects deduped slugs
    expect(content.batchManifest.sites[1].slug).toBe('same-name-2');
    expect(content.batchManifest.sites[2].slug).toBe('same-name-3');
  });

  it('single-site run still produces batch manifest', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Solo Co', trade: 'hvac', location: 'Denver' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    expect(content.batchManifest).toBeDefined();
    expect(content.batchManifest.siteCount).toBe(1);
    expect(content.batchManifest.sites[0].slug).toBe('solo-co');
    expect(content.batchManifest.sites[0].priority).toBe(1);

    expect(content.batchHandoff).toBeDefined();
    expect(content.batchHandoff).toContain('# Batch Handoff — 1 site');
  });

  it('per-site files stay slug-prefixed in multi-site batch', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Prefix A', trade: 'hvac', location: 'LA' },
          { businessName: 'Prefix B', trade: 'plumbing', location: 'NYC' },
          { businessName: 'Prefix C', trade: 'roofing', location: 'SF' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    for (const site of content.sites) {
      const keys = Object.keys(site.files);
      for (const key of keys) {
        expect(key.startsWith(`${site.slug}/`)).toBe(true);
      }
    }
  });
});

describe('Zip export', () => {
  it('produces a valid zip buffer per site', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Zip Co', trade: 'plumbing', location: 'NYC' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const site = content.sites[0];

    // zipFilename and zipBase64 are present
    expect(site.zipFilename).toBe('zip-co.zip');
    expect(typeof site.zipBase64).toBe('string');
    expect(site.zipBase64.length).toBeGreaterThan(0);

    // Decodes to a valid buffer starting with ZIP magic bytes (PK\x03\x04)
    const buf = Buffer.from(site.zipBase64, 'base64');
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);

    // manifest.json inside the zip includes zipFilename
    expect(site.manifest.zipFilename).toBe('zip-co.zip');
  });

  it('zip contains all slug-prefixed files', () => {
    const { execSync } = require('child_process');
    const { writeFileSync, unlinkSync } = require('fs');
    const { join } = require('path');
    const os = require('os');

    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Zip List', trade: 'hvac', location: 'LA', email: 'a@b.co' },
        ],
      },
    });

    const content = JSON.parse(result.artifacts[0].content);
    const site = content.sites[0];
    const zipPath = join(os.tmpdir(), `test-${Date.now()}.zip`);

    try {
      writeFileSync(zipPath, Buffer.from(site.zipBase64, 'base64'));
      const listing = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });

      // All 6 files present under slug prefix
      expect(listing).toContain('zip-list/index.html');
      expect(listing).toContain('zip-list/services.html');
      expect(listing).toContain('zip-list/contact.html');
      expect(listing).toContain('zip-list/manifest.json');
      expect(listing).toContain('zip-list/schema.json');
      expect(listing).toContain('zip-list/HANDOFF.md');
    } finally {
      try { unlinkSync(zipPath); } catch { /* cleanup */ }
    }
  });
});
