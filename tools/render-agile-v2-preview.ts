import fs from 'node:fs';
import path from 'node:path';
import { getSkill } from '../packages/core/src/skills';

const homepageFixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-homepage.json');
const routeFixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-site-routes.json');
const outputDir = path.resolve(process.cwd(), 'outputs/agile-v2-preview');

const homepageFixture = JSON.parse(fs.readFileSync(homepageFixturePath, 'utf8')) as Record<string, unknown>;
const routeFixture = JSON.parse(fs.readFileSync(routeFixturePath, 'utf8')) as Record<string, unknown>;
const homepageSkill = getSkill('render_emdash_homepage');
const bundleSkill = getSkill('render_emdash_site_bundle');

if (!homepageSkill) throw new Error('render_emdash_homepage skill is not registered.');
if (!bundleSkill) throw new Error('render_emdash_site_bundle skill is not registered.');

const homepageResult = homepageSkill.execute({ fixture: homepageFixture }) as Record<string, unknown>;
const homepageFiles = homepageResult.files as Record<string, string>;
const homepageHtml = homepageFiles['index.html'];
if (!homepageHtml) throw new Error('Homepage renderer did not produce index.html.');

const bundleResult = bundleSkill.execute({ fixture: routeFixture }) as Record<string, unknown>;
const routeFiles = bundleResult.files as Record<string, string>;

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), homepageHtml, 'utf8');

for (const [relativePath, html] of Object.entries(routeFiles)) {
  const target = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
}

console.log(JSON.stringify({
  status: 'preview_ready',
  homepageRenderer: homepageResult.renderer,
  bundleRenderer: bundleResult.renderer,
  outputDir,
  files: ['index.html', ...Object.keys(routeFiles)].sort(),
  routesRendered: bundleResult.routesRendered,
}, null, 2));
