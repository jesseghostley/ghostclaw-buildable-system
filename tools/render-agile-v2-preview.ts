import fs from 'node:fs';
import path from 'node:path';
import { getSkill } from '../packages/core/src/skills';

const fixturePath = path.resolve(process.cwd(), '__tests__/fixtures/agile-v2-homepage.json');
const outputDir = path.resolve(process.cwd(), 'outputs/agile-v2-preview');
const outputPath = path.join(outputDir, 'index.html');

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
const skill = getSkill('render_emdash_homepage');

if (!skill) {
  throw new Error('render_emdash_homepage skill is not registered.');
}

const result = skill.execute({ fixture }) as Record<string, unknown>;
const files = result.files as Record<string, string>;
const html = files['index.html'];

if (!html) {
  throw new Error('Renderer did not produce index.html.');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');

console.log(JSON.stringify({
  status: result.status,
  renderer: result.renderer,
  outputPath,
  sectionsRendered: result.sectionsRendered,
}, null, 2));
