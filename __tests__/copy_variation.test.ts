import {
  hashString,
  pickVariant,
  getCopyPool,
  interpolate,
  pickCopy,
  getLayoutVariant,
  COPY_POOLS,
  LAYOUT_VARIANTS,
  type CopyPool,
  type LayoutVariant,
} from '../packages/core/src/copy_variation';
import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { auditLog } from '../packages/core/src/audit_log';
import { publishEventStore } from '../packages/core/src/publish_event';
import { eventBus } from '../packages/core/src/event_bus';
import {
  registerRuntimeSubscribers,
  resetSubscriberState,
} from '../packages/core/src/runtime_subscribers';

function resetAll() {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
  assignmentStore.reset();
  auditLog.reset();
  publishEventStore.reset();
  eventBus.reset();
  resetSubscriberState();
  registerRuntimeSubscribers();
}

// ── hashString ──────────────────────────────────────────────────────────────

describe('hashString', () => {
  it('returns a non-negative integer', () => {
    expect(hashString('test')).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hashString('test'))).toBe(true);
  });

  it('is deterministic — same input always returns same hash', () => {
    const h1 = hashString('Acme Roofing');
    const h2 = hashString('Acme Roofing');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different strings', () => {
    const h1 = hashString('Acme Roofing');
    const h2 = hashString('Best Roofing');
    expect(h1).not.toBe(h2);
  });
});

// ── pickVariant ─────────────────────────────────────────────────────────────

describe('pickVariant', () => {
  const pool = ['alpha', 'bravo', 'charlie', 'delta'];

  it('returns a value from the pool', () => {
    const result = pickVariant(pool, 'Any Business');
    expect(pool).toContain(result);
  });

  it('is deterministic — same businessName returns same variant', () => {
    const r1 = pickVariant(pool, 'Acme Roofing');
    const r2 = pickVariant(pool, 'Acme Roofing');
    expect(r1).toBe(r2);
  });

  it('produces different selections for different names (high probability)', () => {
    const names = [
      'Alpha Roofing', 'Bravo Roofing', 'Charlie Roofing',
      'Delta Roofing', 'Echo Roofing', 'Foxtrot Roofing',
      'Golf Roofing', 'Hotel Roofing',
    ];
    const selections = new Set(names.map((n) => pickVariant(pool, n)));
    // With 8 names and 4 pool items, we expect at least 2 distinct selections
    expect(selections.size).toBeGreaterThanOrEqual(2);
  });
});

// ── getCopyPool ─────────────────────────────────────────────────────────────

describe('getCopyPool', () => {
  const supportedTrades = ['roofing', 'plumbing', 'electrical', 'hvac', 'painting'];

  it.each(supportedTrades)('returns a pool for trade "%s"', (trade) => {
    const pool = getCopyPool(trade);
    expect(pool.heroes.length).toBeGreaterThanOrEqual(4);
    expect(pool.ctas.length).toBeGreaterThanOrEqual(4);
    expect(pool.serviceDescriptions.length).toBeGreaterThanOrEqual(4);
    expect(pool.contactDescriptions.length).toBeGreaterThanOrEqual(4);
  });

  it('falls back to general pool for unknown trades', () => {
    const pool = getCopyPool('underwater_welding');
    const generalPool = getCopyPool('general');
    expect(pool).toBe(generalPool);
  });

  it('is case-insensitive', () => {
    expect(getCopyPool('Roofing')).toBe(getCopyPool('roofing'));
    expect(getCopyPool('PLUMBING')).toBe(getCopyPool('plumbing'));
  });

  it('trims whitespace', () => {
    expect(getCopyPool('  roofing  ')).toBe(getCopyPool('roofing'));
  });
});

// ── Pool content quality ────────────────────────────────────────────────────

describe('copy pool content', () => {
  const allTrades = Object.keys(COPY_POOLS);

  it.each(allTrades)('trade "%s" has no empty strings in any pool', (trade) => {
    const pool = COPY_POOLS[trade];
    for (const [key, arr] of Object.entries(pool)) {
      for (let i = 0; i < (arr as string[]).length; i++) {
        expect((arr as string[])[i].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it.each(allTrades)('trade "%s" heroes contain {location} or {businessName} placeholders', (trade) => {
    const pool = COPY_POOLS[trade];
    for (const hero of pool.heroes) {
      const hasPlaceholder = hero.includes('{location}') || hero.includes('{businessName}');
      expect(hasPlaceholder).toBe(true);
    }
  });
});

// ── interpolate ─────────────────────────────────────────────────────────────

describe('interpolate', () => {
  it('replaces all placeholders', () => {
    const result = interpolate(
      '{businessName} serves {location} with great {trade} work.',
      { businessName: 'Acme', trade: 'roofing', location: 'Denver' },
    );
    expect(result).toBe('Acme serves Denver with great roofing work.');
  });

  it('handles multiple occurrences of the same placeholder', () => {
    const result = interpolate(
      '{businessName} and {businessName}',
      { businessName: 'Acme', trade: 'roofing', location: 'Denver' },
    );
    expect(result).toBe('Acme and Acme');
  });
});

// ── pickCopy ────────────────────────────────────────────────────────────────

describe('pickCopy', () => {
  it('picks and interpolates in one step', () => {
    const pool = getCopyPool('roofing');
    const result = pickCopy(pool.heroes, 'Acme Roofing', {
      businessName: 'Acme Roofing',
      trade: 'roofing',
      location: 'Denver',
    });
    // Should not contain raw placeholders
    expect(result).not.toContain('{businessName}');
    expect(result).not.toContain('{location}');
    expect(result).not.toContain('{trade}');
    expect(result.length).toBeGreaterThan(10);
  });
});

// ── Layout variations ───────────────────────────────────────────────────────

describe('getLayoutVariant', () => {
  it('returns a layout with all 5 pages', () => {
    const layout = getLayoutVariant('roofing', 'Acme Roofing');
    expect(layout.home).toBeDefined();
    expect(layout.services).toBeDefined();
    expect(layout.about).toBeDefined();
    expect(layout.gallery).toBeDefined();
    expect(layout.contact).toBeDefined();
  });

  it('is deterministic', () => {
    const l1 = getLayoutVariant('roofing', 'Acme Roofing');
    const l2 = getLayoutVariant('roofing', 'Acme Roofing');
    expect(l1).toBe(l2);
  });

  it('falls back to general for unknown trades', () => {
    const layout = getLayoutVariant('deep_sea_diving', 'Acme Diving');
    expect(layout.home).toBeDefined();
    // Every layout starts with hero
    expect(layout.home[0]).toBe('hero');
  });

  it('all layouts include hero as the first home section', () => {
    for (const [trade, variants] of Object.entries(LAYOUT_VARIANTS)) {
      for (let i = 0; i < variants.length; i++) {
        expect(variants[i].home[0]).toBe('hero');
      }
    }
  });

  it('all layouts include form in contact sections', () => {
    for (const [trade, variants] of Object.entries(LAYOUT_VARIANTS)) {
      for (let i = 0; i < variants.length; i++) {
        expect(variants[i].contact).toContain('form');
      }
    }
  });

  it('each trade has 2-3 layout variants', () => {
    for (const [trade, variants] of Object.entries(LAYOUT_VARIANTS)) {
      expect(variants.length).toBeGreaterThanOrEqual(2);
      expect(variants.length).toBeLessThanOrEqual(3);
    }
  });
});

// ── End-to-end: three same-trade businesses produce varied copy ─────────────

describe('same-trade variation (end-to-end)', () => {
  beforeEach(resetAll);

  it('three roofing businesses get different hero text', () => {
    const businesses = ['Acme Roofing LLC', 'Pinnacle Roof Co', 'Summit Roofing Inc'];

    const heroes = businesses.map((name) => {
      const pool = getCopyPool('roofing');
      return pickCopy(pool.heroes, name, {
        businessName: name,
        trade: 'roofing',
        location: 'Denver, CO',
      });
    });

    // With 5 hero variants and 3 businesses, at least 2 should differ
    const unique = new Set(heroes);
    expect(unique.size).toBeGreaterThanOrEqual(2);

    // All should be non-empty and interpolated
    for (const hero of heroes) {
      expect(hero.length).toBeGreaterThan(10);
      expect(hero).not.toContain('{businessName}');
      expect(hero).not.toContain('{location}');
    }
  });

  it('three roofing businesses get different CTAs', () => {
    const businesses = ['Acme Roofing LLC', 'Pinnacle Roof Co', 'Summit Roofing Inc'];

    const ctas = businesses.map((name) => {
      const pool = getCopyPool('roofing');
      return pickCopy(pool.ctas, name, {
        businessName: name,
        trade: 'roofing',
        location: 'Denver, CO',
      });
    });

    const unique = new Set(ctas);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('processSignal produces varied content for different businesses', () => {
    const result1 = processSignal({
      name: 'contractor_website',
      payload: { businessName: 'Acme Roofing LLC', trade: 'roofing', location: 'Denver, CO' },
    });

    const result2 = processSignal({
      name: 'contractor_website',
      payload: { businessName: 'Pinnacle Roof Co', trade: 'roofing', location: 'Denver, CO' },
    });

    // Find generate_page_content artifacts
    const getPageContent = (artifacts: typeof result1.artifacts) => {
      const art = artifacts.find((a) => a.type === 'generate_page_content');
      return art ? JSON.parse(art.content) : null;
    };

    const content1 = getPageContent(result1.artifacts);
    const content2 = getPageContent(result2.artifacts);

    expect(content1).not.toBeNull();
    expect(content2).not.toBeNull();

    // Hero text should differ (different business names at minimum)
    expect(content1.pageContent.home.hero).not.toBe(content2.pageContent.home.hero);
  });

  it('same business produces identical content on rerun', () => {
    const result1 = processSignal({
      name: 'contractor_website',
      payload: { businessName: 'Acme Roofing LLC', trade: 'roofing', location: 'Denver, CO' },
    });

    resetAll();

    const result2 = processSignal({
      name: 'contractor_website',
      payload: { businessName: 'Acme Roofing LLC', trade: 'roofing', location: 'Denver, CO' },
    });

    const getPageContent = (artifacts: typeof result1.artifacts) => {
      const art = artifacts.find((a) => a.type === 'generate_page_content');
      return art ? JSON.parse(art.content) : null;
    };

    const content1 = getPageContent(result1.artifacts);
    const content2 = getPageContent(result2.artifacts);

    expect(content1.pageContent.home.hero).toBe(content2.pageContent.home.hero);
    expect(content1.pageContent.home.cta).toBe(content2.pageContent.home.cta);
    expect(content1.pageContent.services.description).toBe(content2.pageContent.services.description);
  });
});
