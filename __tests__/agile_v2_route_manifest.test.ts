import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve(process.cwd(), 'docs/company-sites/agile-v2-route-manifest.yaml');
const fixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-site-routes.json');

function manifestRoutes(yaml: string): Array<{ path: string; status: string }> {
  const routeSection = yaml.split('\nroute_rules:')[0];
  const blocks = routeSection.split(/\n(?=\s{2}- path: )/).slice(1);
  return blocks.map((block) => {
    const routePath = block.match(/^\s{2}- path:\s+(\S+)/m)?.[1];
    const status = block.match(/^\s{4}status:\s+(\S+)/m)?.[1];
    if (!routePath || !status) throw new Error(`Invalid route block in manifest:\n${block}`);
    return { path: routePath, status };
  });
}

describe('Agile V2 route manifest', () => {
  const yaml = fs.readFileSync(manifestPath, 'utf8');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
    routes: Array<{ path: string }>;
    plannedRoutes: string[];
  };
  const manifest = manifestRoutes(yaml);

  it('has no duplicate route paths', () => {
    const paths = manifest.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('accounts for every manifest route in executable or planned fixture state', () => {
    const fixturePaths = new Set(['/', ...fixture.routes.map((route) => route.path), ...fixture.plannedRoutes]);
    expect(Array.from(fixturePaths).sort()).toEqual(manifest.map((route) => route.path).sort());
  });

  it('marks every executable route renderable in the manifest', () => {
    const statuses = new Map(manifest.map((route) => [route.path, route.status]));
    expect(statuses.get('/')).toBe('renderable');
    for (const route of fixture.routes) expect(statuses.get(route.path)).toBe('renderable');
  });

  it('keeps planned fixture routes marked planned in the manifest', () => {
    const statuses = new Map(manifest.map((route) => [route.path, route.status]));
    for (const routePath of fixture.plannedRoutes) expect(statuses.get(routePath)).toBe('planned');
  });
});
