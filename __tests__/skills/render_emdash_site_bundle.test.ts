import fs from 'node:fs';
import path from 'node:path';
import { getSkill } from '../../packages/core/src/skills';

const fixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-site-routes.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
const skill = getSkill('render_emdash_site_bundle')!;

describe('render_emdash_site_bundle skill', () => {
  it('renders the Agile V2 route bundle into static output paths', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    expect(output.status).toBe('preview_ready');
    expect(output.renderer).toBe('emdash-site-bundle-v1');
    const files = output.files as Record<string, string>;
    expect(files['system/index.html']).toContain('One connected growth system');
    expect(files['ai-websites/index.html']).toContain('built from a system');
    expect(files['local-seo/index.html']).toContain('work your company actually does');
    expect(files['conversion-learning/index.html']).toContain('Build once. Learn continuously.');
    expect(files['conversion-learning/index.html']).toContain('Measure the right outcome');
    expect(files['contractors/index.html']).toContain('Built for the niche');
    expect(files['contractors/restoration/index.html']).toContain('emergency search traffic');
    expect(files['contractors/roofing/index.html']).toContain('storm demand');
    expect(files['contractors/foundation-repair/index.html']).toContain('qualified inspection');
    expect(files['contractors/garage-doors/index.html']).toContain('repair, replacement and emergency intent');
    expect(files['contractors/epoxy-flooring/index.html']).toContain('visual project proof');
    expect(files['get-started/index.html']).toContain('Find the constraint');
    expect(files['get-started/index.html']).toContain('Once measurement is connected');
  });

  it('emits unique canonicals and preview noindex directives', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    const files = output.files as Record<string, string>;
    expect(files['system/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/system/">');
    expect(files['ai-websites/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/ai-websites/">');
    expect(files['local-seo/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/local-seo/">');
    expect(files['conversion-learning/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/conversion-learning/">');
    expect(files['contractors/restoration/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/contractors/restoration/">');
    expect(files['contractors/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/contractors/">');
    expect(files['get-started/index.html']).toContain('<meta name="robots" content="noindex,nofollow">');
  });

  it('does not create a fake get-started form submission endpoint', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    const html = (output.files as Record<string, string>)['get-started/index.html'];
    expect(html).toContain('intentionally does not submit data anywhere');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('action=');
  });

  it('keeps conversion-learning copy free of unsupported performance claims', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    const html = (output.files as Record<string, string>)['conversion-learning/index.html'];
    expect(html).not.toMatch(/\b(?:2x|100%|50%|30%)\b/i);
    expect(html).not.toContain('guaranteed conversion lift');
    expect(html).toContain('Qualified leads, booked calls and revenue');
  });

  it('classifies internal links as resolved, planned, or dead', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    const report = output.linkReport as { resolved: string[]; planned: string[]; dead: string[] };
    expect(report.resolved).toEqual(expect.arrayContaining([
      '/system/',
      '/ai-websites/',
      '/local-seo/',
      '/conversion-learning/',
      '/contractors/',
      '/contractors/restoration/',
      '/contractors/roofing/',
      '/contractors/foundation-repair/',
      '/contractors/garage-doors/',
      '/contractors/epoxy-flooring/',
      '/get-started/',
    ]));
    expect(report.planned).toEqual(expect.arrayContaining(['/projects/', '/case-studies/', '/about/']));
    expect(report.dead).toEqual([]);
  });

  it('flags unrecognized internal links as dead', () => {
    const modified = JSON.parse(JSON.stringify(fixture));
    modified.routes[0].cards = [{ title: 'Broken', href: '/not-a-real-route/' }];
    const output = skill.execute({ fixture: modified }) as Record<string, unknown>;
    expect(output.status).toBe('preview_has_dead_links');
    const report = output.linkReport as { dead: string[] };
    expect(report.dead).toContain('/not-a-real-route/');
  });

  it('rejects duplicate route titles', () => {
    const modified = JSON.parse(JSON.stringify(fixture));
    modified.routes[1].title = modified.routes[0].title;
    expect(() => skill.execute({ fixture: modified })).toThrow('Duplicate route title');
  });

  it('escapes route content before rendering', () => {
    const modified = JSON.parse(JSON.stringify(fixture));
    modified.routes[0].headline = '<script>alert(1)</script>';
    const output = skill.execute({ fixture: modified }) as Record<string, unknown>;
    const html = (output.files as Record<string, string>)['system/index.html'];
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
