import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { runtimeStore, Artifact } from './runtime_loop';

// ── Public Types ─────────────────────────────────────────────────────────────

export interface SiteGeneratorResult {
  outputDir: string;
  files: string[];
  businessSlug: string;
  siteUrl: string;
  zipPath?: string;
  error?: string;
}

/** Data bag collected from artifacts + signal for template rendering. */
export interface SiteContext {
  publishEventId: string;
  /** The signalId that originated this site's artifact chain (null if chain is broken). */
  signalId: string | null;
  businessName: string;
  businessSlug: string;
  trade: string;
  location: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  pageContent: any;
  siteStructure: any;
  qaReport: any;
  pages: string[];
  footerNav: string[];
  baseUrl: string;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findArtifactsByType(type: string): Artifact[] {
  return runtimeStore.artifacts.filter((a) => a.type === type);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJsonLd(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ── Asset Resolution ─────────────────────────────────────────────────────────

const PLACEHOLDER_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
  <rect width="200" height="60" fill="#1e40af" rx="6"/>
  <text x="100" y="36" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="16" font-weight="bold">LOGO</text>
</svg>`;

const PLACEHOLDER_SVG_HERO = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <rect width="1200" height="400" fill="#e2e8f0"/>
  <text x="600" y="200" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="24">Hero Image — Replace with real photo</text>
</svg>`;

const PLACEHOLDER_SVG_SERVICE = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#f1f5f9"/>
  <text x="300" y="200" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="18">Service Photo</text>
</svg>`;

const PLACEHOLDER_SVG_GALLERY = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#f1f5f9"/>
  <text x="300" y="200" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="18">Gallery Photo</text>
</svg>`;

interface AssetSlot {
  filename: string;
  placeholder: string;
}

const ASSET_SLOTS: AssetSlot[] = [
  { filename: 'logo.png', placeholder: PLACEHOLDER_SVG_LOGO },
  { filename: 'hero-1.jpg', placeholder: PLACEHOLDER_SVG_HERO },
  { filename: 'service-1.jpg', placeholder: PLACEHOLDER_SVG_SERVICE },
  { filename: 'service-2.jpg', placeholder: PLACEHOLDER_SVG_SERVICE },
  { filename: 'gallery-1.jpg', placeholder: PLACEHOLDER_SVG_GALLERY },
];

/** Maps asset filenames to their manifest keys. */
const ASSET_MANIFEST_KEYS: Record<string, string> = {
  'logo.png': 'logo',
  'hero-1.jpg': 'hero',
  'service-1.jpg': 'servicePrimary',
  'service-2.jpg': 'serviceSecondary',
  'gallery-1.jpg': 'galleryPrimary',
};

export interface AssetManifest {
  [key: string]: string | boolean;
  logo: string;
  hero: string;
  servicePrimary: string;
  serviceSecondary: string;
  galleryPrimary: string;
  fallbacksUsed: boolean;
}

interface ResolvedAssets {
  /** Map from base filename (e.g. "hero-1") to relative path for HTML templates. */
  paths: Record<string, string>;
  /** The asset-manifest.json content. */
  manifest: AssetManifest;
}

/**
 * For each asset slot, check if a real file exists in `assetsSourceDir`.
 * If not, write the SVG placeholder. Returns both the HTML path map and the
 * asset-manifest.json data with fallback tracking.
 */
function resolveAssets(publicHtmlDir: string, assetsSourceDir?: string): ResolvedAssets {
  const assetsDir = path.join(publicHtmlDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const paths: Record<string, string> = {};
  const manifest: Record<string, string | boolean> = {};
  let anyFallback = false;

  for (const slot of ASSET_SLOTS) {
    const baseName = slot.filename.replace(/\.[^.]+$/, '');
    const manifestKey = ASSET_MANIFEST_KEYS[slot.filename] || baseName;
    const destReal = path.join(assetsDir, slot.filename);

    // Check if a real asset was provided
    let found = false;
    if (assetsSourceDir) {
      const srcPath = path.join(assetsSourceDir, slot.filename);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destReal);
        found = true;
      }
    }

    if (found) {
      paths[baseName] = `assets/${slot.filename}`;
      manifest[manifestKey] = `/assets/${slot.filename}`;
    } else {
      // Write SVG placeholder
      const svgName = `${baseName}.svg`;
      fs.writeFileSync(path.join(assetsDir, svgName), slot.placeholder);
      paths[baseName] = `assets/${svgName}`;
      manifest[manifestKey] = `/assets/${svgName}`;
      anyFallback = true;
    }
  }

  manifest.fallbacksUsed = anyFallback;

  return { paths, manifest: manifest as AssetManifest };
}

// ── SEO: JSON-LD ─────────────────────────────────────────────────────────────

function buildLocalBusinessJsonLd(ctx: SiteContext): string {
  const ld: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: ctx.businessName,
    url: ctx.baseUrl,
  };

  if (ctx.trade) ld.description = `${ctx.businessName} — professional ${tradeServices(ctx.trade)} in ${ctx.location}`;
  if (ctx.phone) ld.telephone = ctx.phone;
  if (ctx.email) ld.email = ctx.email;

  if (ctx.city || ctx.state) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(ctx.city ? { addressLocality: ctx.city } : {}),
      ...(ctx.state ? { addressRegion: ctx.state } : {}),
    };
  }

  return JSON.stringify(ld, null, 2);
}

// ── SEO: robots.txt & sitemap.xml ────────────────────────────────────────────

function buildRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
}

function buildSitemapXml(baseUrl: string, pages: string[], generatedAt: string): string {
  const dateStr = generatedAt.split('T')[0]; // YYYY-MM-DD
  const entries = pages.map((p) => {
    const loc = p === 'home' ? `${baseUrl}/` : `${baseUrl}/${p}.html`;
    const priority = p === 'home' ? '1.0' : p === 'services' ? '0.8' : '0.6';
    return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${dateStr}</lastmod>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

// ── CSS ──────────────────────────────────────────────────────────────────────

function buildStylesCss(): string {
  return `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.7; }
a { color: #2563eb; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; display: block; }

/* Navigation */
nav { background: #0f172a; padding: 16px 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
nav .brand { display: flex; align-items: center; gap: 10px; color: #f8fafc; font-weight: 700; font-size: 18px; margin-right: auto; text-decoration: none; }
nav .brand img { height: 36px; width: auto; }
nav a { color: #93c5fd; font-size: 14px; }
nav a.active { color: #fff; font-weight: 600; }

/* Hero */
.hero { background: linear-gradient(135deg, #1e40af 0%, #1e3a5f 100%); color: #fff; padding: 72px 32px; text-align: center; position: relative; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; opacity: 0.15; background-size: cover; background-position: center; }
.hero-content { position: relative; z-index: 1; }
.hero h1 { font-size: 2.4rem; margin-bottom: 16px; }
.hero p { font-size: 1.15rem; opacity: 0.92; max-width: 640px; margin: 0 auto 24px; }
.cta { display: inline-block; background: #f59e0b; color: #1e293b; padding: 14px 36px; border-radius: 6px; font-weight: 700; font-size: 16px; text-decoration: none; }
.cta:hover { background: #d97706; text-decoration: none; }

/* Main content */
main { max-width: 900px; margin: 40px auto; padding: 0 24px; }
.card { background: #fff; border-radius: 10px; padding: 32px; margin-bottom: 28px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card h2 { color: #1e40af; margin-bottom: 12px; font-size: 1.3rem; }
.card p { color: #475569; }
.card img { border-radius: 8px; margin-bottom: 16px; }

/* Grid */
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }

/* Section badges */
.badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 3px 12px; border-radius: 4px; font-size: 12px; margin: 4px 3px; font-weight: 500; }

/* Gallery */
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin-top: 24px; }
.gallery img { border-radius: 8px; width: 100%; aspect-ratio: 3/2; object-fit: cover; }

/* Contact form placeholder */
.form-placeholder { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 32px; text-align: center; color: #64748b; }

/* About */
.about-content { display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; }
.about-content img { flex: 0 0 260px; border-radius: 10px; }
.about-text { flex: 1; min-width: 260px; }

/* Footer */
footer { background: #0f172a; color: #94a3b8; padding: 28px 32px; text-align: center; font-size: 13px; margin-top: 56px; }
footer a { color: #93c5fd; }

/* QA badge */
.qa-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; }

/* Responsive */
@media (max-width: 640px) {
  nav { padding: 12px 16px; }
  .hero { padding: 48px 16px; }
  .hero h1 { font-size: 1.6rem; }
  main { padding: 0 16px; }
  .about-content img { flex: 0 0 100%; }
}
`;
}

// ── HTML Shell ───────────────────────────────────────────────────────────────

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
}

function htmlPage(
  ctx: SiteContext,
  meta: PageMeta,
  activePage: string,
  body: string,
  assets: Record<string, string>,
): string {
  const navLinks = ctx.pages
    .map((p) => {
      const href = p === 'home' ? 'index.html' : `${p}.html`;
      const label = p.charAt(0).toUpperCase() + p.slice(1);
      const cls = p === activePage ? ' class="active"' : '';
      return `<a href="${href}"${cls}>${label}</a>`;
    })
    .join('\n    ');

  const footerLinks = ctx.footerNav.map((l) => escapeHtml(l)).join(' &middot; ');

  const jsonLd = activePage === 'home' ? `\n  <script type="application/ld+json">\n${buildLocalBusinessJsonLd(ctx)}\n  </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${escapeHtml(meta.canonical)}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:type" content="${meta.ogType || 'website'}">
  <meta property="og:url" content="${escapeHtml(meta.canonical)}">
  <meta property="og:image" content="${escapeHtml(ctx.baseUrl + '/' + assets['hero-1'])}">
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="${assets['logo']}" type="image/svg+xml">${jsonLd}
</head>
<body>
  <nav>
    <a class="brand" href="index.html">
      <img src="${assets['logo']}" alt="${escapeHtml(ctx.businessName)} logo" height="36">
      ${escapeHtml(ctx.businessName)}
    </a>
    ${navLinks}
  </nav>
  ${body}
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(ctx.businessName)}. All rights reserved.</p>
    ${footerLinks ? `<p style="margin-top:6px">${footerLinks}</p>` : ''}
    <p style="margin-top:12px;font-size:11px;opacity:0.6">Generated by GhostClaw &mdash; ${ctx.generatedAt}</p>
  </footer>
</body>
</html>`;
}

// ── Page Builders ────────────────────────────────────────────────────────────

function buildHomePage(ctx: SiteContext, assets: Record<string, string>): string {
  const home = ctx.pageContent?.home || {};
  const qaBadge = ctx.qaReport?.passed ? '<span class="qa-badge">QA Passed</span>' : '';

  const h1 = escapeHtml(buildHomeH1(ctx));
  const subtitle = escapeHtml(buildHomeSubtitle(ctx, home));

  // Filter internal tokens, render only human-readable service badges
  const humanSections = humanizeSections(home.sections || []);
  const sectionBadges = humanSections.length > 0
    ? humanSections.map((s: string) => `<span class="badge">${escapeHtml(s)}</span>`).join(' ')
    : '';

  const ctaText = home.cta || 'Get a Free Estimate';
  const ctaHtml = `<a class="cta" href="contact.html">${escapeHtml(ctaText)}</a>`;

  const tradeTc = titleCase(ctx.trade);

  const body = `<div class="hero">
    <div class="hero-bg" style="background-image:url('${assets['hero-1']}')"></div>
    <div class="hero-content">
      <h1>${h1}${qaBadge}</h1>
      <p>${subtitle}</p>
      ${ctaHtml}
    </div>
  </div>
  <main>
    <div class="card">
      <h2>${escapeHtml(tradeServices(tradeTc))} We Provide</h2>
      ${sectionBadges ? `<p>${sectionBadges}</p>` : `<p>From routine maintenance to full-scale projects, we handle all aspects of ${escapeHtml(ctx.trade)} for residential and commercial properties in ${escapeHtml(ctx.city || ctx.location)}.</p>`}
    </div>
    <div class="grid-2">
      <div class="card">
        <img src="${assets['service-1']}" alt="${escapeHtml(tradeTc)} work by ${escapeHtml(ctx.businessName)}">
        <h2>Expert ${escapeHtml(tradeTc)} You Can Count On</h2>
        <p>Our experienced team has been delivering dependable ${escapeHtml(ctx.trade)} results across ${escapeHtml(ctx.city || ctx.location)} and the surrounding area for years.</p>
      </div>
      <div class="card">
        <h2>Locally Owned in ${escapeHtml(ctx.city || ctx.location)}</h2>
        <p>As a local ${escapeHtml(ctx.trade)} company, we understand ${escapeHtml(ctx.city || ctx.location)}&rsquo;s building codes, weather conditions, and what homeowners here need most.</p>
      </div>
    </div>
  </main>`;

  const meta: PageMeta = {
    title: `${ctx.businessName} | ${tradeTc} in ${ctx.location}`,
    description: buildHomeMetaDescription(ctx),
    canonical: ctx.baseUrl + '/',
  };

  return htmlPage(ctx, meta, 'home', body, assets);
}

/**
 * Map common service section slugs to trade-aware, human-readable card content.
 */
function serviceCardContent(slug: string, ctx: SiteContext): { heading: string; body: string } {
  const tradeTc = titleCase(ctx.trade);
  const city = ctx.city || ctx.location;
  const map: Record<string, { heading: string; body: string }> = {
    service_list: {
      heading: `Our ${tradeServices(tradeTc)}`,
      body: `We offer a complete range of ${tradeServices(ctx.trade)} for homeowners and businesses in ${city}. Every job is handled by trained, licensed professionals.`,
    },
    pricing: {
      heading: 'Transparent Pricing',
      body: `We provide upfront, honest estimates with no hidden fees. Every ${ctx.trade} project is scoped clearly before work begins.`,
    },
    faq: {
      heading: 'Frequently Asked Questions',
      body: `Have questions about our ${ctx.trade} process, timelines, or warranties? We're happy to walk you through every step.`,
    },
  };
  if (map[slug]) return map[slug];
  // Fallback: humanize the slug
  const label = titleCase(slug.replace(/_/g, ' '));
  return { heading: label, body: `${ctx.businessName} delivers professional ${tradeServices(label.toLowerCase())} throughout ${city}.` };
}

function buildServicesPage(ctx: SiteContext, assets: Record<string, string>): string {
  const svc = ctx.pageContent?.services || {};
  const tradeTc = titleCase(ctx.trade);

  const serviceImages = [assets['service-1'], assets['service-2']];
  const sections: string[] = svc.sections || ['service_list', 'pricing', 'faq'];
  const cards = sections
    .map((s: string, i: number) => {
      const { heading, body } = serviceCardContent(s, ctx);
      const imgTag = i < serviceImages.length ? `<img src="${serviceImages[i]}" alt="${escapeHtml(heading)}">` : '';
      return `<div class="card">${imgTag}<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></div>`;
    })
    .join('\n    ');

  const body = `<div class="hero">
    <h1>${escapeHtml(tradeServices(tradeTc))} in ${escapeHtml(ctx.city || ctx.location)}</h1>
    <p>${escapeHtml(dedupeServices(svc.description || `${ctx.businessName} offers a full range of ${tradeServices(ctx.trade)} for residential and commercial properties.`))}</p>
  </div>
  <main>
    ${cards}
  </main>`;

  const meta: PageMeta = {
    title: `${tradeServices(tradeTc)} — ${ctx.businessName} | ${ctx.location}`,
    description: dedupeServices(svc.description || `Explore ${tradeServices(ctx.trade)} offered by ${ctx.businessName} in ${ctx.location}.`),
    canonical: ctx.baseUrl + '/services.html',
  };

  return htmlPage(ctx, meta, 'services', body, assets);
}

function buildAboutPage(ctx: SiteContext, assets: Record<string, string>): string {
  const about = ctx.pageContent?.about || {};
  const tradeTc = titleCase(ctx.trade);
  const city = escapeHtml(ctx.city || ctx.location);

  const body = `<div class="hero">
    <h1>${escapeHtml(about.title || `About ${ctx.businessName}`)}</h1>
    <p>${escapeHtml(about.subtitle || `Your trusted ${ctx.trade} team in ${ctx.location}.`)}</p>
  </div>
  <main>
    <div class="card">
      <div class="about-content">
        <img src="${assets['gallery-1']}" alt="The ${escapeHtml(ctx.businessName)} team">
        <div class="about-text">
          <h2>Who We Are</h2>
          <p>${escapeHtml(about.description || `${ctx.businessName} is a locally owned ${ctx.trade} company serving ${ctx.location} and the surrounding area. Our crew is dedicated to honest pricing, clean job sites, and work that holds up long after we leave.`)}</p>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Why ${city} Trusts ${escapeHtml(ctx.businessName)}</h2>
      <p>Licensed and insured ${escapeHtml(ctx.trade)} professionals with hands-on experience across ${city}. We stand behind every job with a satisfaction guarantee.</p>
    </div>
  </main>`;

  const meta: PageMeta = {
    title: `About Us — ${ctx.businessName} | ${ctx.location}`,
    description: about.description || `Learn about ${ctx.businessName}, a trusted ${ctx.trade} company in ${ctx.location}.`,
    canonical: ctx.baseUrl + '/about.html',
  };

  return htmlPage(ctx, meta, 'about', body, assets);
}

function buildContactPage(ctx: SiteContext, assets: Record<string, string>): string {
  const contact = ctx.pageContent?.contact || {};

  const contactDetails: string[] = [];
  if (ctx.phone) contactDetails.push(`<p><strong>Phone:</strong> <a href="tel:${escapeHtml(ctx.phone)}">${escapeHtml(ctx.phone)}</a></p>`);
  if (ctx.email) contactDetails.push(`<p><strong>Email:</strong> <a href="mailto:${escapeHtml(ctx.email)}">${escapeHtml(ctx.email)}</a></p>`);
  if (ctx.location) contactDetails.push(`<p><strong>Service Area:</strong> ${escapeHtml(ctx.location)}</p>`);

  const body = `<div class="hero">
    <h1>${escapeHtml(contact.title || 'Contact Us')}</h1>
    <p>${escapeHtml(contact.description || `Get a free ${ctx.trade} estimate from a local team that shows up on time.`)}</p>
  </div>
  <main>
    <div class="card">
      <h2>Get In Touch</h2>
      ${contactDetails.length > 0 ? contactDetails.join('\n      ') : '<p>Reach out to discuss your project.</p>'}
    </div>
    <div class="card">
      <h2>Request a Free Estimate</h2>
      <div class="form-placeholder">Contact form placeholder &mdash; connect your form provider (Formspree, Netlify Forms, or a cPanel mail handler) here.</div>
    </div>
  </main>`;

  const meta: PageMeta = {
    title: `Contact — ${ctx.businessName} | ${ctx.location}`,
    description: contact.description || `Contact ${ctx.businessName} for ${tradeServices(ctx.trade)} in ${ctx.location}. Free estimates available.`,
    canonical: ctx.baseUrl + '/contact.html',
  };

  return htmlPage(ctx, meta, 'contact', body, assets);
}

// ── Zip Packaging ────────────────────────────────────────────────────────────

/**
 * Creates a .tar.gz archive of the public_html directory.
 * Uses Node built-in zlib — no external dependency.
 *
 * The tar format produced is a minimal POSIX tar (512-byte header blocks)
 * sufficient for cPanel File Manager import.
 */
export function createSiteArchive(publicHtmlDir: string, outputPath: string): void {
  const buffers: Buffer[] = [];

  function addFile(archivePath: string, content: Buffer): void {
    // TAR header (512 bytes)
    const header = Buffer.alloc(512);
    // name (0-99)
    header.write(archivePath.slice(0, 99), 0, 99, 'utf8');
    // mode (100-107)
    header.write('0000644\0', 100, 8, 'utf8');
    // uid/gid (108-123)
    header.write('0001000\0', 108, 8, 'utf8');
    header.write('0001000\0', 116, 8, 'utf8');
    // size (124-135) — octal
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf8');
    // mtime (136-147)
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
    header.write(mtime, 136, 12, 'utf8');
    // typeflag (156) — '0' for regular file
    header.write('0', 156, 1, 'utf8');
    // magic (257-262)
    header.write('ustar\0', 257, 6, 'utf8');
    // version (263-264)
    header.write('00', 263, 2, 'utf8');
    // checksum placeholder (148-155): spaces
    header.write('        ', 148, 8, 'utf8');
    // Compute checksum
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

    buffers.push(header);
    buffers.push(content);
    // Pad to 512-byte boundary
    const remainder = content.length % 512;
    if (remainder > 0) buffers.push(Buffer.alloc(512 - remainder));
  }

  function walkDir(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const archivePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walkDir(full, archivePath);
      } else {
        addFile(`public_html/${archivePath}`, fs.readFileSync(full));
      }
    }
  }

  walkDir(publicHtmlDir, '');

  // Two 512-byte zero blocks = end of archive
  buffers.push(Buffer.alloc(1024));

  const tarData = Buffer.concat(buffers);
  const gzipped = zlib.gzipSync(tarData);
  fs.writeFileSync(outputPath, gzipped);
}

// ── Text Helpers ─────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

/**
 * Append "services" to a trade name only if it doesn't already end with
 * "service" or "services" — prevents "emergency storm services services".
 * Preserves casing: if the trade is Title Cased, appends "Services".
 */
function tradeServices(trade: string): string {
  if (/services?\s*$/i.test(trade)) return trade;
  // Match the casing of the input: if first char is uppercase, append "Services"
  const suffix = /^[A-Z]/.test(trade) ? 'Services' : 'services';
  return `${trade} ${suffix}`;
}

/**
 * Sanitize any text that may contain "services services" from artifact content.
 */
function dedupeServices(text: string): string {
  return text.replace(/\bservices\s+services\b/gi, 'services');
}

/**
 * Internal section tokens that should never appear as visible copy.
 * These come from planner/agent output and are structural, not user-facing.
 */
const INTERNAL_SECTION_TOKENS = new Set([
  'hero', 'cta', 'services_overview', 'testimonials', 'footer',
  'header', 'nav', 'navigation', 'sidebar', 'meta', 'seo',
  'schema', 'json_ld', 'sitemap', 'robots',
]);

/**
 * Humanize a section slug: filter internal tokens, convert underscores
 * to spaces, and title-case the result.
 */
function humanizeSections(sections: string[]): string[] {
  return sections
    .filter((s) => !INTERNAL_SECTION_TOKENS.has(s.toLowerCase()))
    .map((s) => titleCase(s.replace(/_/g, ' ')));
}

/**
 * Build a natural-sounding H1 for a contractor homepage.
 * Always returns the business name alone — trade+location belongs in the subtitle.
 */
function buildHomeH1(ctx: SiteContext): string {
  return ctx.businessName;
}

/**
 * Build the hero subtitle — the line below the H1.
 * Generates a clean, location-aware line. Ignores artifact hero text if it
 * matches the generic "Professional X services in Y" pattern — that template
 * filler reads poorly as rendered copy.
 */
function buildHomeSubtitle(ctx: SiteContext, homeData: any): string {
  const raw: string = homeData?.hero || '';
  // Reject common template filler patterns
  const isGenericFiller = !raw
    || raw.length <= 10
    || /^professional\s+/i.test(raw)
    || /\bservices\b.*\bin\b/i.test(raw);

  if (!isGenericFiller) return raw;

  const city = ctx.city || ctx.location;
  return `${city}'s trusted ${ctx.trade} team. Licensed, insured, and ready to work.`;
}

/**
 * Build a useful meta description — not just the hero subtitle rehashed.
 */
function buildHomeMetaDescription(ctx: SiteContext): string {
  const city = ctx.city || ctx.location;
  return `${ctx.businessName} provides ${tradeServices(ctx.trade)} in ${ctx.location}. Call ${ctx.phone || 'us'} for a free estimate from a local, licensed team in ${city}.`;
}

function parseLocation(location: string): { city: string; state: string } {
  const match = location.match(/^(.+?),\s*([A-Z]{2})\s*$/);
  if (match) return { city: match[1].trim(), state: match[2] };
  const parts = location.split(',').map((p) => p.trim());
  return { city: parts[0] || location, state: parts[1] || '' };
}

// ── Context Builder ──────────────────────────────────────────────────────────

/**
 * Trace an artifact back to its originating signal via: artifact → job → plan → signal.
 * Returns the signalId or null if the chain is broken.
 */
function traceArtifactToSignal(artifactId: string): string | null {
  const artifact = runtimeStore.artifacts.find((a) => a.id === artifactId);
  if (!artifact) return null;

  const job = runtimeStore.jobs.find((j) => j.id === artifact.jobId);
  if (!job) return null;

  const plan = runtimeStore.plans.find((p) => p.id === job.planId);
  if (!plan) return null;

  return plan.signalId;
}

/**
 * Find all artifacts that belong to the same signal chain.
 * Walks: signal → plans → jobs → artifacts, filtered by type.
 */
function findArtifactsByTypeInChain(type: string, signalId: string): Artifact[] {
  const planIds = new Set(
    runtimeStore.plans.filter((p) => p.signalId === signalId).map((p) => p.id),
  );
  const jobIds = new Set(
    runtimeStore.jobs.filter((j) => planIds.has(j.planId)).map((j) => j.id),
  );
  return runtimeStore.artifacts.filter((a) => a.type === type && jobIds.has(a.jobId));
}

function buildSiteContext(publishEventId: string, artifactId: string): SiteContext | { error: string } {
  const artifact = runtimeStore.artifacts.find((a) => a.id === artifactId);

  // Trace the trigger artifact back to its originating signal
  const signalId = traceArtifactToSignal(artifactId);

  // Scope all artifact lookups to this signal's chain
  const pageContentArtifacts = signalId
    ? findArtifactsByTypeInChain('generate_page_content', signalId)
    : findArtifactsByType('generate_page_content');
  const siteStructureArtifacts = signalId
    ? findArtifactsByTypeInChain('design_site_structure', signalId)
    : findArtifactsByType('design_site_structure');
  const qaArtifacts = signalId
    ? findArtifactsByTypeInChain('review_and_approve', signalId)
    : findArtifactsByType('review_and_approve');

  let pageContent: any = null;
  let siteStructure: any = null;
  let qaReport: any = null;

  if (artifact) {
    try {
      const parsed = JSON.parse(artifact.content);
      if (parsed.pageContent) pageContent = parsed.pageContent;
      if (parsed.siteStructure) siteStructure = parsed.siteStructure;
      if (parsed.qaReport) qaReport = parsed.qaReport;
    } catch (_) { /* ignore */ }
  }

  if (!pageContent && pageContentArtifacts.length > 0) {
    try {
      const parsed = JSON.parse(pageContentArtifacts[pageContentArtifacts.length - 1].content);
      if (parsed.pageContent) pageContent = parsed.pageContent;
      if (!siteStructure && parsed.siteStructure) siteStructure = parsed.siteStructure;
    } catch (_) { /* ignore */ }
  }
  if (!siteStructure && siteStructureArtifacts.length > 0) {
    try {
      const parsed = JSON.parse(siteStructureArtifacts[siteStructureArtifacts.length - 1].content);
      if (parsed.siteStructure) siteStructure = parsed.siteStructure;
    } catch (_) { /* ignore */ }
  }
  if (!qaReport && qaArtifacts.length > 0) {
    try {
      const parsed = JSON.parse(qaArtifacts[qaArtifacts.length - 1].content);
      if (parsed.qaReport) qaReport = parsed.qaReport;
    } catch (_) { /* ignore */ }
  }

  if (!pageContent && !siteStructure) {
    return { error: 'No pageContent or siteStructure artifacts found.' };
  }

  // Extract from the signal that belongs to this artifact's chain (not the global last one)
  let phone = '';
  let email = '';
  let trade = '';
  let location = '';
  const chainSignal = signalId
    ? runtimeStore.signals.find((s) => s.id === signalId)
    : runtimeStore.signals[runtimeStore.signals.length - 1];
  if (chainSignal) {
    const sp = (chainSignal as any).payload || {};
    phone = sp.phone || '';
    email = sp.email || '';
    trade = sp.trade || '';
    location = sp.location || '';
  }

  const businessName = siteStructure?.businessName || qaReport?.businessName || 'Contractor';
  const businessSlug = slugify(businessName);
  const { city, state } = parseLocation(location);

  return {
    publishEventId,
    signalId,
    businessName,
    businessSlug,
    trade: trade || 'contracting',
    location: location || 'your area',
    city: city || location,
    state,
    phone,
    email,
    pageContent,
    siteStructure,
    qaReport,
    pages: ['home', 'services', 'about', 'contact'],
    footerNav: siteStructure?.navigation?.footer || [],
    baseUrl: `/sites/${publishEventId}`,
    generatedAt: new Date().toISOString(),
  };
}

// ── Main Generator ───────────────────────────────────────────────────────────

export function generateSite(publishEventId: string, artifactId: string): SiteGeneratorResult {
  const ctxOrErr = buildSiteContext(publishEventId, artifactId);

  if ('error' in ctxOrErr) {
    return { outputDir: '', files: [], businessSlug: '', siteUrl: '', error: ctxOrErr.error };
  }

  const ctx = ctxOrErr;

  // Output layout: output/sites/{publishEventId}/public_html/*
  const siteRoot = path.resolve(__dirname, '..', '..', '..', 'output', 'sites', publishEventId);
  const publicHtml = path.join(siteRoot, 'public_html');
  fs.mkdirSync(publicHtml, { recursive: true });

  const files: string[] = [];

  // Resolve assets (real images or SVG placeholders)
  const assetsSourceDir = path.join(siteRoot, 'assets_source');
  const { paths: assets, manifest: assetManifest } = resolveAssets(
    publicHtml,
    fs.existsSync(assetsSourceDir) ? assetsSourceDir : undefined,
  );

  // styles.css
  fs.writeFileSync(path.join(publicHtml, 'styles.css'), buildStylesCss());
  files.push('styles.css');

  // HTML pages
  fs.writeFileSync(path.join(publicHtml, 'index.html'), buildHomePage(ctx, assets));
  files.push('index.html');

  fs.writeFileSync(path.join(publicHtml, 'services.html'), buildServicesPage(ctx, assets));
  files.push('services.html');

  fs.writeFileSync(path.join(publicHtml, 'about.html'), buildAboutPage(ctx, assets));
  files.push('about.html');

  fs.writeFileSync(path.join(publicHtml, 'contact.html'), buildContactPage(ctx, assets));
  files.push('contact.html');

  // robots.txt
  fs.writeFileSync(path.join(publicHtml, 'robots.txt'), buildRobotsTxt(ctx.baseUrl));
  files.push('robots.txt');

  // sitemap.xml
  fs.writeFileSync(path.join(publicHtml, 'sitemap.xml'), buildSitemapXml(ctx.baseUrl, ctx.pages, ctx.generatedAt));
  files.push('sitemap.xml');

  // asset-manifest.json (inside public_html — drives asset resolution for templates)
  fs.writeFileSync(path.join(publicHtml, 'asset-manifest.json'), JSON.stringify(assetManifest, null, 2));
  files.push('asset-manifest.json');

  // Asset files (already written by resolveAssets, record them)
  const assetsDir = path.join(publicHtml, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      files.push(`assets/${f}`);
    }
  }

  // site.json — written to both public_html (served) and site root (metadata)
  const siteUrl = `/sites/${publishEventId}/public_html/index.html`;
  const siteManifest = {
    publishEventId,
    businessName: ctx.businessName,
    businessSlug: ctx.businessSlug,
    trade: ctx.trade,
    location: ctx.location,
    city: ctx.city,
    state: ctx.state,
    generatedAt: ctx.generatedAt,
    outputDir: publicHtml,
    siteUrl,
    files,
    artifacts: {
      siteStructure: (ctx.signalId ? findArtifactsByTypeInChain('design_site_structure', ctx.signalId) : findArtifactsByType('design_site_structure')).slice(-1)[0]?.id ?? null,
      pageContent: (ctx.signalId ? findArtifactsByTypeInChain('generate_page_content', ctx.signalId) : findArtifactsByType('generate_page_content')).slice(-1)[0]?.id ?? null,
      qaReport: (ctx.signalId ? findArtifactsByTypeInChain('review_and_approve', ctx.signalId) : findArtifactsByType('review_and_approve')).slice(-1)[0]?.id ?? null,
    },
    qaStatus: ctx.qaReport?.passed ? 'passed' : 'unknown',
    seo: {
      title: `${ctx.businessName} — ${titleCase(ctx.trade)} in ${ctx.location}`,
      description: `${ctx.businessName} provides professional ${tradeServices(ctx.trade)} in ${ctx.location}.`,
      canonical: ctx.baseUrl + '/',
      hasJsonLd: true,
      hasSitemap: true,
      hasRobotsTxt: true,
    },
  };
  fs.writeFileSync(path.join(publicHtml, 'site.json'), JSON.stringify(siteManifest, null, 2));
  files.push('site.json');
  fs.writeFileSync(path.join(siteRoot, 'site.json'), JSON.stringify(siteManifest, null, 2));

  // Zip archive for cPanel deployment
  const zipName = `${ctx.businessSlug}-${publishEventId}.tar.gz`;
  const zipPath = path.join(siteRoot, zipName);
  createSiteArchive(publicHtml, zipPath);
  files.push(zipName);

  return { outputDir: publicHtml, files, businessSlug: ctx.businessSlug, siteUrl, zipPath };
}
