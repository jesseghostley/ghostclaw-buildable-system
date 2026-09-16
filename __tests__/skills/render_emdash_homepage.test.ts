import { getSkill } from '../../packages/core/src/skills';

const skill = getSkill('render_emdash_homepage')!;

describe('render_emdash_homepage skill', () => {
  const fixture = {
    site: { name: 'Agile Marketing Systems Inc.', canonical: 'https://agilemarketingsystems.com/' },
    seo: {
      title: 'AI Website & Growth Systems for Contractors | Agile Marketing Systems',
      description: 'Contractor-specific AI websites, local search infrastructure, lead capture, automation, proof, and growth systems.',
    },
    hero: {
      eyebrow: 'AI Website & Growth Systems for Contractors',
      headline: 'Turn Your Website Into a Growth System',
      subhead: 'One connected system for websites, local search, proof, leads, automation, and reporting.',
      primaryCta: { label: "See What We'd Build", href: '/get-started/', event: 'cta_primary_get_started' },
      secondaryCta: { label: 'Explore the System', href: '/system/', event: 'cta_secondary_system' },
    },
    problem: {
      heading: 'Your website probably is not the real problem.',
      body: 'The constraint is often the disconnected system around it.',
      items: ['Website', 'SEO', 'CRM', 'Content', 'Reviews', 'Automation'],
    },
    system: {
      heading: 'One connected contractor growth system',
      cards: [
        { title: 'AI Website', body: 'Fast, niche-specific and conversion-focused.' },
        { title: 'Project Engine', body: 'Turn completed jobs into local proof.' },
      ],
    },
    niches: {
      heading: 'Built for the niche',
      cards: [{ title: 'Restoration' }, { title: 'Roofing' }],
    },
    projects: {
      heading: 'Every completed job should make the next sale easier.',
      hideWhenEmpty: true,
      cards: [],
    },
    process: {
      heading: 'From configuration to launch',
      steps: [
        { title: 'Diagnose', body: 'Find the limiting constraint.' },
        { title: 'Configure', body: 'Select the right niche modules.' },
      ],
    },
    technology: {
      heading: 'Built to be fast, portable, and yours',
      body: 'The flagship should demonstrate the same architecture we sell.',
      bullets: ['Cloudflare delivery', 'Structured content', 'Controlled AI generation'],
    },
    caseStudies: { heading: 'Case studies', hideWhenEmpty: true, cards: [] },
    faq: {
      heading: 'Questions',
      items: [{ question: 'Is this just a website?', answer: 'No. The website is one part of the connected growth system.' }],
    },
    finalCta: {
      heading: 'See what your contractor growth system should look like.',
      body: 'Map the current stack and identify the biggest constraint.',
      primaryCta: { label: 'Build My Growth Plan', href: '/get-started/', event: 'cta_final_growth_plan' },
    },
  };

  it('renders a structured homepage with SEO and analytics hooks', () => {
    const output = skill.execute({ signalPayload: { homepageConfig: fixture } }) as Record<string, unknown>;
    expect(output.status).toBe('preview_ready');
    const files = output.files as Record<string, string>;
    const html = files['index.html'];
    expect(html).toContain('<h1>Turn Your Website Into a Growth System</h1>');
    expect(html).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/">');
    expect(html).toContain('data-analytics-event="cta_primary_get_started"');
    expect(html).toContain('data-analytics-event="cta_final_growth_plan"');
  });

  it('hides project and case-study sections when verified proof is empty', () => {
    const output = skill.execute({ signalPayload: { homepageConfig: fixture } }) as Record<string, unknown>;
    const sections = output.sectionsRendered as string[];
    expect(sections).not.toContain('projects');
    expect(sections).not.toContain('case-studies');
  });

  it('escapes untrusted text before rendering', () => {
    const modified = JSON.parse(JSON.stringify(fixture));
    modified.hero.headline = '<script>alert(1)</script>';
    const output = skill.execute({ signalPayload: { homepageConfig: modified } }) as Record<string, unknown>;
    const html = (output.files as Record<string, string>)['index.html'];
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('rejects fixtures missing required SEO or hero fields', () => {
    expect(() => skill.execute({ signalPayload: { homepageConfig: { site: { name: 'Agile' } } } })).toThrow('EmDash homepage fixture requires seo.title.');
  });
});
