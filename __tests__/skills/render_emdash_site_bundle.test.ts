import fs from 'node:fs';
import path from 'node:path';
import { getSkill } from '../../packages/core/src/skills';

const fixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-site-routes.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
const skill = getSkill('render_emdash_site_bundle')!;

describe('render_emdash_site_bundle skill', () => {
  it('renders the first three Agile V2 routes into static output paths', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    expect(output.status).toBe('preview_ready');
    expect(output.renderer).toBe('emdash-site-bundle-v1');
    const files = output.files as Record<string, string>;
    expect(files['system/index.html']).toContain('One connected growth system');
    expect(files['contractors/index.html']).toContain('Built for the niche');
    expect(files['get-started/index.html']).toContain('Find the constraint');
  });

  it('emits unique canonicals and preview noindex directives', () => {
    const output = skill.execute({ fixture }) as Record<string, unknown>;
    const files = output.files as Record<string, string>;
    expect(files['system/index.html']).toContain('<link rel="canonical" href="https://agilemarketingsystems.com/system/">');
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
