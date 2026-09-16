import fs from 'node:fs';
import path from 'node:path';
import { getSkill } from '../../packages/core/src/skills';

const skill = getSkill('render_emdash_homepage')!;

function loadFixture(): Record<string, unknown> {
  const fixturePath = path.resolve(__dirname, '../fixtures/agile-v2-homepage.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
}

describe('render_emdash_homepage Agile V2 integration fixture', () => {
  it('renders the flagship homepage from the checked-in structured fixture', () => {
    const output = skill.execute({ fixture: loadFixture() }) as Record<string, unknown>;

    expect(output.renderer).toBe('emdash-homepage-v1');
    expect(output.status).toBe('preview_ready');

    const files = output.files as Record<string, string>;
    const html = files['index.html'];

    expect(html).toContain('<h1>Turn Your Website Into a Growth System</h1>');
    expect(html).toContain('AI Website');
    expect(html).toContain('Restoration');
    expect(html).toContain('From configuration to launch');
    expect(html).toContain('data-analytics-event="cta_hero_get_started"');
    expect(html).toContain('data-analytics-event="cta_footer_build_growth_plan"');
    expect(html).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/">');
  });

  it('suppresses unverified proof sections when the fixture contains no verified cards', () => {
    const output = skill.execute({ fixture: loadFixture() }) as Record<string, unknown>;
    const files = output.files as Record<string, string>;
    const html = files['index.html'];
    const sections = output.sectionsRendered as string[];

    expect(sections).not.toContain('projects');
    expect(sections).not.toContain('case-studies');
    expect(html).not.toContain('id="projects"');
    expect(html).not.toContain('id="case-studies"');
  });

  it('emits the agreed SEO metadata from the fixture', () => {
    const output = skill.execute({ fixture: loadFixture() }) as Record<string, unknown>;
    const meta = output.meta as Record<string, unknown>;

    expect(meta.title).toBe('AI Website & Growth Systems for Contractors | Agile Marketing Systems');
    expect(meta.description).toContain('Contractor-specific AI websites');
    expect(meta.canonical).toBe('https://agilemarketingsystems.com/');
  });
});
