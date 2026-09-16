import type { SkillModule } from './index';

type CTA = { label: string; href: string; event?: string };
type NavItem = { label: string; href: string };
type Card = { title: string; body?: string; href?: string };
type ContentSection = { heading: string; body: string };
type RouteConfig = {
  path: string;
  title: string;
  description: string;
  eyebrow?: string;
  headline: string;
  intro?: string;
  sections?: ContentSection[];
  cards?: Card[];
  primaryCta?: CTA;
  conversion?: { mode?: string; message?: string };
};
type BundleConfig = {
  site?: { name?: string; origin?: string };
  brand?: {
    nav?: NavItem[];
    headerCta?: CTA;
    footer?: { tagline?: string; links?: NavItem[]; legal?: string };
  };
  routes?: RouteConfig[];
  plannedRoutes?: string[];
};

type LinkReport = {
  resolved: string[];
  planned: string[];
  dead: string[];
};

function esc(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;',
  }[char] ?? char));
}

function requireText(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`EmDash site bundle requires ${path}.`);
  return value.trim();
}

function normalizeRoutePath(value: string): string {
  const path = requireText(value, 'routes[].path');
  if (!path.startsWith('/') || !path.endsWith('/')) throw new Error(`Route path must start and end with "/": ${path}`);
  return path;
}

function canonical(origin: string, routePath: string): string {
  return `${origin.replace(/\/$/, '')}${routePath}`;
}

function outputPath(routePath: string): string {
  if (routePath === '/') return 'index.html';
  return `${routePath.replace(/^\//, '')}index.html`;
}

function renderCta(cta?: CTA, className = 'button'): string {
  if (!cta?.label || !cta.href) return '';
  const event = cta.event ? ` data-analytics-event="${esc(cta.event)}"` : '';
  return `<a class="${className}" href="${esc(cta.href)}"${event}>${esc(cta.label)}</a>`;
}

function renderNav(items: NavItem[] = [], aria = 'Primary'): string {
  if (items.length === 0) return '';
  return `<nav class="nav-links" aria-label="${esc(aria)}">${items.map((item) => `<a href="${esc(requireText(item.href, 'brand.nav[].href'))}">${esc(requireText(item.label, 'brand.nav[].label'))}</a>`).join('')}</nav>`;
}

function renderHeader(siteName: string, brand: BundleConfig['brand']): string {
  return `<header class="site-header"><div class="container header-inner"><a class="brand" href="/">${esc(siteName)}</a>${renderNav(brand?.nav ?? [])}${brand?.headerCta ? `<div class="header-cta">${renderCta(brand.headerCta, 'button button-small')}</div>` : ''}</div></header>`;
}

function renderFooter(siteName: string, brand: BundleConfig['brand']): string {
  const footer = brand?.footer;
  const links = footer?.links?.length ? renderNav(footer.links, 'Footer') : '';
  return `<footer class="site-footer"><div class="container footer-inner"><div><strong>${esc(siteName)}</strong>${footer?.tagline ? `<p>${esc(footer.tagline)}</p>` : ''}</div>${links}<p class="footer-legal">${footer?.legal ? esc(footer.legal) : esc(siteName)}</p></div></footer>`;
}

function renderRoute(route: RouteConfig, siteName: string, origin: string, brand: BundleConfig['brand']): string {
  const routePath = normalizeRoutePath(route.path);
  const title = requireText(route.title, `route ${routePath} title`);
  const description = requireText(route.description, `route ${routePath} description`);
  const headline = requireText(route.headline, `route ${routePath} headline`);
  const sections = (route.sections ?? []).map((section) => `<section class="content-block"><h2>${esc(requireText(section.heading, 'routes[].sections[].heading'))}</h2><p>${esc(requireText(section.body, 'routes[].sections[].body'))}</p></section>`).join('');
  const cards = (route.cards ?? []).length ? `<section class="grid">${(route.cards ?? []).map((card) => `<article class="card"><h2>${esc(requireText(card.title, 'routes[].cards[].title'))}</h2>${card.body ? `<p>${esc(card.body)}</p>` : ''}${card.href ? `<a href="${esc(card.href)}">Explore</a>` : ''}</article>`).join('')}</section>` : '';
  const conversion = route.conversion?.message ? `<aside class="notice" data-conversion-mode="${esc(route.conversion.mode ?? 'unset')}"><strong>Preview conversion state</strong><p>${esc(route.conversion.message)}</p></aside>` : '';

  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow">',
    `<title>${esc(title)}</title><meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(canonical(origin, routePath))}">`,
    '<style>',
    ':root{font-family:Inter,system-ui,sans-serif;color:#10202e;background:#fff}*{box-sizing:border-box}body{margin:0}a{color:inherit}.container{width:min(1120px,calc(100% - 32px));margin:auto}.site-header{border-bottom:1px solid #e7ecef;background:#fff}.header-inner{min-height:72px;display:flex;align-items:center;gap:24px}.brand{font-weight:850;text-decoration:none;white-space:nowrap}.nav-links{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto}.nav-links a{text-decoration:none;font-weight:650}.header-cta{margin-left:8px}.button{display:inline-block;padding:14px 20px;border-radius:10px;text-decoration:none;background:#10202e;color:#fff;font-weight:700}.button-small{padding:11px 15px}.hero{padding:88px 0 56px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-weight:750}.hero h1{font-size:clamp(2.6rem,7vw,5.1rem);line-height:.98;max-width:980px;margin:.2em 0}.lede{font-size:1.22rem;line-height:1.65;max-width:820px}.content{padding:20px 0 72px}.content-block{max-width:820px;padding:26px 0;border-top:1px solid #e7ecef}.content-block h2,.card h2{font-size:1.55rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;margin:20px 0 36px}.card{border:1px solid #d9e0e4;border-radius:16px;padding:22px}.notice{max-width:820px;padding:20px;border-radius:14px;background:#f5f7f8;border:1px solid #d9e0e4;margin:28px 0}.site-footer{border-top:1px solid #e7ecef;padding:40px 0}.footer-inner{display:grid;grid-template-columns:1fr auto;gap:24px}.footer-legal{grid-column:1/-1;color:#536575;font-size:.9rem}@media(max-width:900px){.header-inner{align-items:flex-start;flex-direction:column;padding:18px 0}.nav-links{margin-left:0}.header-cta{margin-left:0}.footer-inner{grid-template-columns:1fr}.footer-legal{grid-column:auto}}',
    '</style></head><body>',
    renderHeader(siteName, brand),
    `<main><section class="hero"><div class="container">${route.eyebrow ? `<p class="eyebrow">${esc(route.eyebrow)}</p>` : ''}<h1>${esc(headline)}</h1>${route.intro ? `<p class="lede">${esc(route.intro)}</p>` : ''}${route.primaryCta ? `<div>${renderCta(route.primaryCta)}</div>` : ''}</div></section><div class="container content">${sections}${cards}${conversion}</div></main>`,
    renderFooter(siteName, brand),
    '</body></html>',
  ].join('');
}

function collectInternalHrefs(files: Record<string, string>): string[] {
  const hrefs = new Set<string>();
  const pattern = /href="(\/[^"#?]*\/?)"/g;
  for (const html of Object.values(files)) {
    for (const match of html.matchAll(pattern)) hrefs.add(match[1]);
  }
  return Array.from(hrefs).sort();
}

function validateLinks(files: Record<string, string>, renderedRoutes: Set<string>, plannedRoutes: Set<string>): LinkReport {
  const report: LinkReport = { resolved: [], planned: [], dead: [] };
  for (const href of collectInternalHrefs(files)) {
    const normalized = href === '/' ? '/' : href.endsWith('/') ? href : `${href}/`;
    if (renderedRoutes.has(normalized)) report.resolved.push(normalized);
    else if (plannedRoutes.has(normalized)) report.planned.push(normalized);
    else report.dead.push(normalized);
  }
  return report;
}

function execute(inputPayload: Record<string, unknown>): Record<string, unknown> {
  const payload = (inputPayload.signalPayload ?? inputPayload) as Record<string, unknown>;
  const config = (payload.siteConfig ?? payload.fixture ?? payload) as BundleConfig;
  const siteName = requireText(config.site?.name, 'site.name');
  const origin = requireText(config.site?.origin, 'site.origin');
  const routes = config.routes ?? [];
  if (routes.length === 0) throw new Error('EmDash site bundle requires at least one route.');

  const seenPaths = new Set<string>(['/']);
  const seenTitles = new Set<string>();
  const files: Record<string, string> = {};
  for (const route of routes) {
    const routePath = normalizeRoutePath(route.path);
    if (seenPaths.has(routePath)) throw new Error(`Duplicate route path: ${routePath}`);
    seenPaths.add(routePath);
    const title = requireText(route.title, `route ${routePath} title`);
    if (seenTitles.has(title)) throw new Error(`Duplicate route title: ${title}`);
    seenTitles.add(title);
    files[outputPath(routePath)] = renderRoute(route, siteName, origin, config.brand);
  }

  const plannedRoutes = new Set((config.plannedRoutes ?? []).map(normalizeRoutePath));
  const linkReport = validateLinks(files, seenPaths, plannedRoutes);

  return {
    renderer: 'emdash-site-bundle-v1',
    status: linkReport.dead.length === 0 ? 'preview_ready' : 'preview_has_dead_links',
    files,
    routesRendered: Array.from(seenPaths),
    linkReport,
  };
}

const renderEmdashSiteBundleSkill: SkillModule = {
  skillId: 'render_emdash_site_bundle',
  execute,
};

export default renderEmdashSiteBundleSkill;
