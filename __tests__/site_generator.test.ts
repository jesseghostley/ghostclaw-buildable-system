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
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;

  seedBatchSite('signal_1', 'plan_1', businessName, trade, location, phone, email);
}

/**
 * Add a single site's full chain (signal → plan → jobs → artifacts) to runtimeStore.
 * Does NOT clear the store — allows stacking multiple sites for batch tests.
 */
function seedBatchSite(
  signalId: string,
  planId: string,
  businessName: string,
  trade: string,
  location: string,
  phone: string,
  email: string,
): { artifactIds: string[] } {
  const jobIds = [`${planId}_job_1`, `${planId}_job_2`, `${planId}_job_3`];
  const artifactIds = [`${planId}_art_1`, `${planId}_art_2`, `${planId}_art_3`];

  runtimeStore.signals.push({
    id: signalId,
    name: 'contractor_website',
    payload: { businessName, trade, location, phone, email },
    createdAt: Date.now(),
  });

  runtimeStore.plans.push({
    id: planId,
    signalId,
    action: 'build_contractor_website' as any,
    strategyId: 'contractor_website',
    strategyType: 'rule' as any,
    createdAt: Date.now(),
  });

  runtimeStore.jobs.push(
    { id: jobIds[0], planId, jobType: 'design_site_structure', assignedAgent: null, status: 'completed', inputPayload: null, outputPayload: null, retryCount: 0, createdAt: Date.now(), updatedAt: Date.now() } as any,
    { id: jobIds[1], planId, jobType: 'generate_page_content', assignedAgent: null, status: 'completed', inputPayload: null, outputPayload: null, retryCount: 0, createdAt: Date.now(), updatedAt: Date.now() } as any,
    { id: jobIds[2], planId, jobType: 'review_and_approve', assignedAgent: null, status: 'completed', inputPayload: null, outputPayload: null, retryCount: 0, createdAt: Date.now(), updatedAt: Date.now() } as any,
  );

  runtimeStore.artifacts.push(
    {
      id: artifactIds[0],
      jobId: jobIds[0],
      skillInvocationId: `${planId}_inv_1`,
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
      id: artifactIds[1],
      jobId: jobIds[1],
      skillInvocationId: `${planId}_inv_2`,
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
      id: artifactIds[2],
      jobId: jobIds[2],
      skillInvocationId: `${planId}_inv_3`,
      type: 'review_and_approve',
      content: JSON.stringify({
        qaReport: { passed: true, businessName },
      }),
      createdAt: Date.now(),
    },
  );

  return { artifactIds };
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
    const result = generateSite(PUB_ID, 'plan_1_art_3');
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
    const result = generateSite(PUB_ID, 'plan_1_art_3');
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
      generateSite(PUB_ID, 'plan_1_art_3');
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
      const result = generateSite(PUB_ID_2, 'plan_1_art_3');
      const assetsDir = path.join(result.outputDir, 'assets');

      // logo.png should be the real file (copied from assets_source)
      expect(fs.existsSync(path.join(assetsDir, 'logo.png'))).toBe(true);
      expect(fs.readFileSync(path.join(assetsDir, 'logo.png'), 'utf-8')).toBe('FAKE_PNG_CONTENT');

      // hero-1 should be SVG placeholder
      expect(fs.existsSync(path.join(assetsDir, 'hero-1.svg'))).toBe(true);
    });

    it('asset-manifest.json reflects real vs fallback paths', () => {
      const result = generateSite(PUB_ID_2, 'plan_1_art_3');
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

      const result = generateSite(PUB_ID_3, 'plan_1_art_3');
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

  describe('5-site batch publish mapping', () => {
    const BATCH_SITES = [
      { businessName: 'Apex Roofing Co', trade: 'roofing', location: 'Denver, CO', phone: '303-555-0101', email: 'info@apex.com' },
      { businessName: 'Lone Star Plumbing', trade: 'plumbing', location: 'Austin, TX', phone: '512-555-0202', email: 'info@lonestar.com' },
      { businessName: 'Ouachita Hills Storm Damage', trade: 'storm damage restoration', location: 'Warren, AR', phone: '870-555-0303', email: 'info@ouachita.com' },
      { businessName: 'Pacific HVAC Solutions', trade: 'HVAC', location: 'Portland, OR', phone: '503-555-0404', email: 'info@pacific.com' },
      { businessName: 'Great Lakes Electricians', trade: 'electrical', location: 'Chicago, IL', phone: '312-555-0505', email: 'info@greatlakes.com' },
    ];

    const batchPubIds = BATCH_SITES.map((_, i) => `batch_pub_${i + 1}`);
    const batchSiteRoots = batchPubIds.map((id) => path.join(TEST_OUTPUT_ROOT, id));
    let batchArtifactIds: string[][] = [];

    beforeAll(() => {
      // Clear the store completely
      runtimeStore.signals.length = 0;
      runtimeStore.plans.length = 0;
      runtimeStore.jobs.length = 0;
      runtimeStore.artifacts.length = 0;

      // Seed all 5 sites into the same runtimeStore (simulates a batch)
      batchArtifactIds = BATCH_SITES.map((site, i) => {
        const { artifactIds } = seedBatchSite(
          `batch_signal_${i + 1}`,
          `batch_plan_${i + 1}`,
          site.businessName,
          site.trade,
          site.location,
          site.phone,
          site.email,
        );
        return artifactIds;
      });
    });

    afterAll(() => {
      batchSiteRoots.forEach(cleanDir);
      // Re-seed original test data for any tests that run after
      seedArtifacts('Apex Roofing Co', 'roofing', 'Denver, CO', '303-555-0101', 'info@apex.com');
    });

    it('generates 5 unique publish IDs with unique output folders', () => {
      const results = batchPubIds.map((pubId, i) => {
        // Use the QA artifact (last in chain) as the trigger artifact
        return generateSite(pubId, batchArtifactIds[i][2]);
      });

      // All should succeed
      results.forEach((r) => expect(r.error).toBeUndefined());

      // 5 unique output directories
      const dirs = new Set(results.map((r) => r.outputDir));
      expect(dirs.size).toBe(5);
    });

    it('each site.json has the correct unique business name', () => {
      batchPubIds.forEach((pubId, i) => {
        generateSite(pubId, batchArtifactIds[i][2]);
        const siteJson = JSON.parse(
          fs.readFileSync(path.join(TEST_OUTPUT_ROOT, pubId, 'public_html', 'site.json'), 'utf-8'),
        );
        expect(siteJson.businessName).toBe(BATCH_SITES[i].businessName);
        expect(siteJson.trade).toBe(BATCH_SITES[i].trade);
      });
    });

    it('each site has unique artifact chain references', () => {
      const allArtifactSets: string[][] = [];

      batchPubIds.forEach((pubId, i) => {
        generateSite(pubId, batchArtifactIds[i][2]);
        const siteJson = JSON.parse(
          fs.readFileSync(path.join(TEST_OUTPUT_ROOT, pubId, 'public_html', 'site.json'), 'utf-8'),
        );
        const artifactRefs = [
          siteJson.artifacts.siteStructure,
          siteJson.artifacts.pageContent,
          siteJson.artifacts.qaReport,
        ];
        allArtifactSets.push(artifactRefs);
      });

      // Each site should have different artifact IDs
      for (let i = 0; i < allArtifactSets.length; i++) {
        for (let j = i + 1; j < allArtifactSets.length; j++) {
          expect(allArtifactSets[i]).not.toEqual(allArtifactSets[j]);
        }
      }
    });

    it('page titles match the intended business and city for each folder', () => {
      batchPubIds.forEach((pubId, i) => {
        generateSite(pubId, batchArtifactIds[i][2]);
        const indexHtml = fs.readFileSync(
          path.join(TEST_OUTPUT_ROOT, pubId, 'public_html', 'index.html'),
          'utf-8',
        );
        const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
        expect(titleMatch).not.toBeNull();
        // Title should contain this site's business name, not another site's
        expect(titleMatch![1]).toContain(BATCH_SITES[i].businessName);
      });
    });

    it('no two sites share the same index.html title', () => {
      const titles: string[] = [];
      batchPubIds.forEach((pubId, i) => {
        generateSite(pubId, batchArtifactIds[i][2]);
        const indexHtml = fs.readFileSync(
          path.join(TEST_OUTPUT_ROOT, pubId, 'public_html', 'index.html'),
          'utf-8',
        );
        const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
        titles.push(titleMatch![1]);
      });

      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(5);
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
