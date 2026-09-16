import type { SkillModule } from './index';

type CTA = { label: string; href: string; event?: string };
type Card = { title: string; body?: string; href?: string };
type Step = { title: string; body: string };
type FAQ = { question: string; answer: string };

type HomepageConfig = {
  site?: { name?: string; canonical?: string };
  seo?: { title?: string; description?: string };
  hero?: { eyebrow?: string; headline?: string; subhead?: string; primaryCta?: CTA; secondaryCta?: CTA };
  problem?: { heading?: string; body?: string; items?: string[] };
  system?: { heading?: string; cards?: Card[] };
  niches?: { heading?: string; cards?: Card[] };
  projects?: { heading?: string; body?: string; cards?: Card[]; hideWhenEmpty?: boolean };
  process?: { heading?: string; steps?: Step[] };
  technology?: { heading?: string; body?: string; bullets?: string[] };
  caseStudies?: { heading?: string; cards?: Card[]; hideWhenEmpty?: boolean };
  faq?: { heading?: string; items?: FAQ[] };
  finalCta?: { heading?: string; body?: string; primaryCta?: CTA };
};

function esc(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;',
  }[char] ?? char));
}

function requireText(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`EmDash homepage fixture requires ${path}.`);
  return value.trim();
}

function renderCta(cta?: CTA, className = 'button'): string {
  if (!cta?.label || !cta.href) return '';
  const event = cta.event ? ` data-analytics-event="${esc(cta.event)}"` : '';
  return `<a class="${className}" href="${esc(cta.href)}"${event}>${esc(cta.label)}</a>`;
}

function renderCards(cards: Card[] = []): string {
  return cards.map((card) => [
    '<article class="card">',
    `<h3>${esc(requireText(card.title, 'card.title'))}</h3>`,
    card.body ? `<p>${esc(card.body)}</p>` : '',
    card.href ? `<a href="${esc(card.href)}">Learn more</a>` : '',
    '</article>',
  ].filter(Boolean).join('')).join('');
}

function section(id: string, heading: string | undefined, body: string): string {
  if (!body) return '';
  return `<section id="${id}" class="section"><div class="container">${heading ? `<h2>${esc(heading)}</h2>` : ''}${body}</div></section>`;
}

function execute(inputPayload: Record<string, unknown>): Record<string, unknown> {
  const payload = (inputPayload.signalPayload ?? inputPayload) as Record<string, unknown>;
  const config = (payload.homepageConfig ?? payload.fixture ?? payload) as HomepageConfig;

  const siteName = requireText(config.site?.name, 'site.name');
  const title = requireText(config.seo?.title, 'seo.title');
  const description = requireText(config.seo?.description, 'seo.description');
  const headline = requireText(config.hero?.headline, 'hero.headline');
  const canonical = config.site?.canonical?.trim() || '';

  const hero = section('hero', undefined, [
    config.hero?.eyebrow ? `<p class="eyebrow">${esc(config.hero.eyebrow)}</p>` : '',
    `<h1>${esc(headline)}</h1>`,
    config.hero?.subhead ? `<p class="lede">${esc(config.hero.subhead)}</p>` : '',
    `<div class="actions">${renderCta(config.hero?.primaryCta)}${renderCta(config.hero?.secondaryCta, 'button button-secondary')}</div>`,
  ].filter(Boolean).join(''));

  const problem = section('problem', config.problem?.heading, [
    config.problem?.body ? `<p>${esc(config.problem.body)}</p>` : '',
    (config.problem?.items?.length ?? 0) > 0 ? `<ul>${config.problem!.items!.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '',
  ].join(''));

  const system = section('system', config.system?.heading, `<div class="grid">${renderCards(config.system?.cards)}</div>`);
  const niches = section('niches', config.niches?.heading, `<div class="grid">${renderCards(config.niches?.cards)}</div>`);

  const projectCards = config.projects?.cards ?? [];
  const projects = projectCards.length === 0 && config.projects?.hideWhenEmpty !== false ? '' : section(
    'projects', config.projects?.heading, `${config.projects?.body ? `<p>${esc(config.projects.body)}</p>` : ''}<div class="grid">${renderCards(projectCards)}</div>`,
  );

  const process = section('process', config.process?.heading, `<ol class="steps">${(config.process?.steps ?? []).map((step) => `<li><h3>${esc(requireText(step.title, 'process.steps[].title'))}</h3><p>${esc(requireText(step.body, 'process.steps[].body'))}</p></li>`).join('')}</ol>`);

  const technology = section('technology', config.technology?.heading, [
    config.technology?.body ? `<p>${esc(config.technology.body)}</p>` : '',
    (config.technology?.bullets?.length ?? 0) > 0 ? `<ul>${config.technology!.bullets!.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '',
  ].join(''));

  const caseCards = config.caseStudies?.cards ?? [];
  const caseStudies = caseCards.length === 0 && config.caseStudies?.hideWhenEmpty !== false ? '' : section('case-studies', config.caseStudies?.heading, `<div class="grid">${renderCards(caseCards)}</div>`);

  const faq = section('faq', config.faq?.heading, (config.faq?.items ?? []).map((item) => `<details><summary>${esc(requireText(item.question, 'faq.items[].question'))}</summary><p>${esc(requireText(item.answer, 'faq.items[].answer'))}</p></details>`).join(''));

  const finalCta = section('get-started', config.finalCta?.heading, `${config.finalCta?.body ? `<p>${esc(config.finalCta.body)}</p>` : ''}${renderCta(config.finalCta?.primaryCta)}`);

  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(title)}</title><meta name="description" content="${esc(description)}">`,
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    '<style>',
    ':root{font-family:Inter,system-ui,sans-serif;color:#10202e;background:#fff}*{box-sizing:border-box}body{margin:0}a{color:inherit}.container{width:min(1120px,calc(100% - 32px));margin:auto}.section{padding:72px 0}.section:nth-of-type(even){background:#f5f7f8}h1{font-size:clamp(2.5rem,7vw,5.4rem);line-height:.95;max-width:1000px;margin:.2em 0}h2{font-size:clamp(2rem,4vw,3.4rem);margin-top:0}.lede{font-size:1.25rem;max-width:780px;line-height:1.6}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-weight:700}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.button{display:inline-block;padding:14px 20px;border-radius:10px;text-decoration:none;background:#10202e;color:#fff;font-weight:700}.button-secondary{background:#e8edf0;color:#10202e}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.card{border:1px solid #d9e0e4;border-radius:16px;padding:22px;background:#fff}.steps{display:grid;gap:18px;padding-left:22px}details{padding:18px 0;border-bottom:1px solid #d9e0e4}summary{font-weight:700;cursor:pointer}@media(max-width:640px){.section{padding:48px 0}}',
    '</style></head><body>',
    `<header class="container" style="padding:20px 0;font-weight:800">${esc(siteName)}</header>`,
    '<main>', hero, problem, system, niches, projects, process, technology, caseStudies, faq, finalCta, '</main>',
    `<footer class="container" style="padding:36px 0">&copy; ${new Date().getFullYear()} ${esc(siteName)}</footer>`,
    '</body></html>',
  ].join('');

  return {
    renderer: 'emdash-homepage-v1',
    status: 'preview_ready',
    files: { 'index.html': html },
    meta: { title, description, canonical: canonical || null },
    sectionsRendered: ['hero', 'problem', 'system', 'niches', ...(projects ? ['projects'] : []), 'process', 'technology', ...(caseStudies ? ['case-studies'] : []), 'faq', 'get-started'],
  };
}

const renderEmdashHomepageSkill: SkillModule = {
  skillId: 'render_emdash_homepage',
  execute,
};

export default renderEmdashHomepageSkill;
