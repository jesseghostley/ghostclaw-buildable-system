import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { runtimeStore } from '../packages/core/src/runtime_loop';
import { generateSite, slugify, createSiteArchive } from '../packages/core/src/site_generator';

// Temp directory for test output
const TEST_OUTPUT_ROOT = path.resolve(__dirname, '..', 'output', 'sites');

function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function seedArtifacts(businessName: string, trade: string, location: string, phone: string, email: string): void {
  runtimeStore.signals.length = 0;
  runtimeStore.artifacts.length = 0;

  runtimeStore.signals.push({
    id: 'signal_1',
    name: 'contractor_website',
    payload: { businessName, trade, location, phone, email },
    createdAt: Date.now(),
  });

  runtimeStore.artifacts.push(
    {
      id: 'artifact_job_1',
      jobId: 'job_1',
      skillInvocationId: 'inv_1',
      type: 'design_site_structure',
      content: JSON.stringify({
        siteStructure: {
          businessName,
          pages: ['home', 'services', 'about', 'contact'],
          navigation: { footer: ['Privacy Policy', 'Terms of Service'] },
        },
      }),
      createdAt: Date.now(),
    },
    {
      id: 'artifact_job_2',
      jobId: 'job_2',
      skillInvocationId: 'inv_2',
      type: 'generate_page_content',
      content: JSON.stringify({
        pageContent: {
          home: {
            title: `${businessName} - ${trade}`,
            hero: `Professional ${trade} services in ${location}.`,
            cta: 'Get a Free Estimate',
            sections: ['residential', 'commercial', 'emergency'],
          },
          services: {
            title: 'Our Services',
            description: `Full range of ${trade} services.`,
            sections: ['service_list', 'pricing', 'faq'],
          },
          about: {
            title: `About ${businessName}`,
            subtitle: `Trusted ${trade} partner.`,
            description: `${businessName} has served ${location} for over 10 years.`,
          },
          contact: {
            title: 'Contact Us',
            description: `Reach ${businessName} today.`,
          },
        },
      }),
      createdAt: Date.now(),
    },
    {
      id: 'artifact_job_3',
      jobId: 'job_3',
      skillInvocationId: 'inv_3',
      type: 'review_and_approve',
      content: JSON.stringify({
        qaReport: { passed: true, businessName },
      }),
      createdAt: Date.now(),
    },
  );
}

describe('Site Generator V2', () => {
  const PUB_ID = 'test_pub_001';
  const siteRoot = path.join(TEST_OUTPUT_ROOT, PUB_ID);
  const publicHtml = path.join(siteRoot, 'public_html');

  beforeAll(() => {
    seedArtifacts('Apex Roofing Co', 'roofing', 'Denver, CO', '303-555-0101', 'info@apex.com');
  });

  afterAll(() => {
    cleanDir(siteRoot);
  });

  it('generates all required files in public_html/', () => {
    const result = generateSite(PUB_ID, 'artifact_job_3');
    expect(result.error).toBeUndefined();
    expect(result.outputDir).toBe(publicHtml);

    const expected = [
      'index.html', 'services.html', 'about.html', 'contact.html',
      'styles.css', 'robots.txt', 'sitemap.xml', 'site.json', 'asset-manifest.json',
    ];
    for (const f of expected) {
      expect(fs.existsSync(path.join(publicHtml, f))).toBe(true);
    }
  });

  it('creates assets/ directory with placeholder SVGs including service-2', () => {
    const assetsDir = path.join(publicHtml, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);

    const assetFiles = fs.readdirSync(assetsDir);
    expect(assetFiles).toContain('logo.svg');
    expect(assetFiles).toContain('hero-1.svg');
    expect(assetFiles).toContain('service-1.svg');
    expect(assetFiles).toContain('service-2.svg');
    expect(assetFiles).toContain('gallery-1.svg');
  });

  it('creates asset-manifest.json with role-based keys and fallback tracking', () => {
    const manifestPath = path.join(publicHtml, 'asset-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.logo).toMatch(/^\/assets\/logo\./);
    expect(manifest.hero).toMatch(/^\/assets\/hero-1\./);
    expect(manifest.servicePrimary).toMatch(/^\/assets\/service-1\./);
    expect(manifest.serviceSecondary).toMatch(/^\/assets\/service-2\./);
    expect(manifest.galleryPrimary).toMatch(/^\/assets\/gallery-1\./);
    expect(manifest.fallbacksUsed).toBe(true);
  });

  it('creates site.json in both public_html and site root', () => {
    expect(fs.existsSync(path.join(publicHtml, 'site.json'))).toBe(true);
    expect(fs.existsSync(path.join(siteRoot, 'site.json'))).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(path.join(publicHtml, 'site.json'), 'utf-8'));
    expect(manifest.businessName).toBe('Apex Roofing Co');
    expect(manifest.trade).toBe('roofing');
    expect(manifest.city).toBe('Denver');
    expect(manifest.state).toBe('CO');
    expect(manifest.seo.hasJsonLd).toBe(true);
    expect(manifest.seo.hasSitemap).toBe(true);
  });

  it('HTML pages reference assets from the resolved paths', () => {
    const index = fs.readFileSync(path.join(publicHtml, 'index.html'), 'utf-8');
    const services = fs.readFileSync(path.join(publicHtml, 'services.html'), 'utf-8');
    // Index references hero and service-1
    expect(index).toMatch(/assets\/hero-1\./);
    expect(index).toMatch(/assets\/service-1\./);
    // Services page references service-1 and service-2
    expect(services).toMatch(/assets\/service-1\./);
    expect(services).toMatch(/assets\/service-2\./);
  });

  it('creates a .tar.gz archive for cPanel export', () => {
    const result = generateSite(PUB_ID, 'artifact_job_3');
    expect(result.zipPath).toBeDefined();
    expect(fs.existsSync(result.zipPath!)).toBe(true);
    expect(result.zipPath!).toMatch(/\.tar\.gz$/);

    // Verify it's valid gzip
    const compressed = fs.readFileSync(result.zipPath!);
    const decompressed = zlib.gunzipSync(compressed);
    // TAR files start with file entry names — check for public_html prefix
    const tarContent = decompressed.toString('utf-8', 0, 200);
    expect(tarContent).toContain('public_html/');
  });

  describe('SEO', () => {
    let indexHtml: string;
    let servicesHtml: string;

    beforeAll(() => {
      generateSite(PUB_ID, 'artifact_job_3');
      indexHtml = fs.readFileSync(path.join(publicHtml, 'index.html'), 'utf-8');
      servicesHtml = fs.readFileSync(path.join(publicHtml, 'services.html'), 'utf-8');
    });

    it('has unique title tags per page', () => {
      expect(indexHtml).toMatch(/<title>Apex Roofing Co.*Roofing.*Denver/i);
      expect(servicesHtml).toMatch(/<title>Services.*Apex Roofing/i);
    });

    it('has meta description', () => {
      expect(indexHtml).toMatch(/<meta name="description" content="[^"]+"/);
      expect(servicesHtml).toMatch(/<meta name="description" content="[^"]+"/);
    });

    it('has canonical link', () => {
      expect(indexHtml).toMatch(/<link rel="canonical" href="[^"]+"/);
    });

    it('has Open Graph tags', () => {
      expect(indexHtml).toMatch(/<meta property="og:title"/);
      expect(indexHtml).toMatch(/<meta property="og:description"/);
      expect(indexHtml).toMatch(/<meta property="og:type" content="website"/);
      expect(indexHtml).toMatch(/<meta property="og:url"/);
      expect(indexHtml).toMatch(/<meta property="og:image"/);
    });

    it('has LocalBusiness JSON-LD on home page only', () => {
      expect(indexHtml).toMatch(/application\/ld\+json/);
      expect(indexHtml).toMatch(/"@type":\s*"LocalBusiness"/);
      expect(indexHtml).toMatch(/"telephone":\s*"303-555-0101"/);
      // Services page should NOT have JSON-LD
      expect(servicesHtml).not.toMatch(/application\/ld\+json/);
    });

    it('robots.txt references sitemap', () => {
      const robots = fs.readFileSync(path.join(publicHtml, 'robots.txt'), 'utf-8');
      expect(robots).toContain('Sitemap:');
      expect(robots).toContain('sitemap.xml');
    });

    it('sitemap.xml lists all pages with priorities', () => {
      const sitemap = fs.readFileSync(path.join(publicHtml, 'sitemap.xml'), 'utf-8');
      expect(sitemap).toContain('<urlset');
      // Home page is listed as "/" not "index.html"
      expect(sitemap).toMatch(/test_pub_001\/<\/loc>/);
      expect(sitemap).toMatch(/services\.html/);
      expect(sitemap).toMatch(/about\.html/);
      expect(sitemap).toMatch(/contact\.html/);
      expect(sitemap).toContain('<priority>1.0</priority>');
    });
  });

  describe('Asset resolution with real files', () => {
    const PUB_ID_2 = 'test_pub_002';
    const siteRoot2 = path.join(TEST_OUTPUT_ROOT, PUB_ID_2);

    beforeAll(() => {
      // Create a fake "real" logo in assets_source
      const srcDir = path.join(siteRoot2, 'assets_source');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'logo.png'), 'FAKE_PNG_CONTENT');
    });

    afterAll(() => {
      cleanDir(siteRoot2);
    });

    it('copies real asset when present, uses placeholder for missing', () => {
      const result = generateSite(PUB_ID_2, 'artifact_job_3');
      const assetsDir = path.join(result.outputDir, 'assets');

      // logo.png should be the real file (copied from assets_source)
      expect(fs.existsSync(path.join(assetsDir, 'logo.png'))).toBe(true);
      expect(fs.readFileSync(path.join(assetsDir, 'logo.png'), 'utf-8')).toBe('FAKE_PNG_CONTENT');

      // hero-1 should be SVG placeholder
      expect(fs.existsSync(path.join(assetsDir, 'hero-1.svg'))).toBe(true);
    });

    it('asset-manifest.json reflects real vs fallback paths', () => {
      const result = generateSite(PUB_ID_2, 'artifact_job_3');
      const manifest = JSON.parse(fs.readFileSync(path.join(result.outputDir, 'asset-manifest.json'), 'utf-8'));

      // logo was provided as a real file
      expect(manifest.logo).toBe('/assets/logo.png');
      // hero was not provided — fallback SVG
      expect(manifest.hero).toBe('/assets/hero-1.svg');
      // Mix of real and fallback → fallbacksUsed true
      expect(manifest.fallbacksUsed).toBe(true);
    });

    it('fallbacksUsed is false when all assets are provided', () => {
      const PUB_ID_3 = 'test_pub_003';
      const siteRoot3 = path.join(TEST_OUTPUT_ROOT, PUB_ID_3);
      const srcDir = path.join(siteRoot3, 'assets_source');
      fs.mkdirSync(srcDir, { recursive: true });

      // Provide ALL asset files
      fs.writeFileSync(path.join(srcDir, 'logo.png'), 'LOGO');
      fs.writeFileSync(path.join(srcDir, 'hero-1.jpg'), 'HERO');
      fs.writeFileSync(path.join(srcDir, 'service-1.jpg'), 'SVC1');
      fs.writeFileSync(path.join(srcDir, 'service-2.jpg'), 'SVC2');
      fs.writeFileSync(path.join(srcDir, 'gallery-1.jpg'), 'GAL');

      const result = generateSite(PUB_ID_3, 'artifact_job_3');
      const manifest = JSON.parse(fs.readFileSync(path.join(result.outputDir, 'asset-manifest.json'), 'utf-8'));

      expect(manifest.logo).toBe('/assets/logo.png');
      expect(manifest.hero).toBe('/assets/hero-1.jpg');
      expect(manifest.servicePrimary).toBe('/assets/service-1.jpg');
      expect(manifest.serviceSecondary).toBe('/assets/service-2.jpg');
      expect(manifest.galleryPrimary).toBe('/assets/gallery-1.jpg');
      expect(manifest.fallbacksUsed).toBe(false);

      cleanDir(siteRoot3);
    });
  });

  describe('Error handling', () => {
    it('returns error when no artifacts are available', () => {
      const originalArtifacts = [...runtimeStore.artifacts];
      runtimeStore.artifacts.length = 0;

      const result = generateSite('test_pub_err', 'nonexistent');
      expect(result.error).toBe('No pageContent or siteStructure artifacts found.');
      expect(result.files.length).toBe(0);

      runtimeStore.artifacts.push(...originalArtifacts);
    });
  });

  describe('slugify', () => {
    it('converts business name to URL-safe slug', () => {
      expect(slugify('Apex Roofing Co')).toBe('apex-roofing-co');
      expect(slugify("Smith & Sons, LLC")).toBe('smith-sons-llc');
      expect(slugify('  Leading  Spaces  ')).toBe('leading-spaces');
    });
  });

  describe('createSiteArchive', () => {
    it('creates a valid tar.gz with public_html/ prefix', () => {
      const tmpDir = path.join(TEST_OUTPUT_ROOT, '_tar_test');
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'hello');
      const archivePath = path.join(TEST_OUTPUT_ROOT, '_tar_test.tar.gz');

      createSiteArchive(tmpDir, archivePath);

      expect(fs.existsSync(archivePath)).toBe(true);
      const data = zlib.gunzipSync(fs.readFileSync(archivePath));
      expect(data.toString('utf-8', 0, 50)).toContain('public_html/test.txt');

      cleanDir(tmpDir);
      fs.unlinkSync(archivePath);
    });
  });
});
