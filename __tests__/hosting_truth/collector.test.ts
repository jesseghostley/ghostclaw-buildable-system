import type { DiscoveryFact } from '../../packages/core/src/hosting_truth/types';
import {
  createDiscoveryFact,
  computeOverallConfidence,
  computeCategoryConfidence,
  generateHumanSummary,
  validateFact,
} from '../../packages/core/src/hosting_truth/evidence';
import {
  collectHostingTruth,
  createApprovalRecord,
  resolveApproval,
} from '../../packages/core/src/hosting_truth/collector';

function makeFact(overrides: Partial<DiscoveryFact> = {}): DiscoveryFact {
  return {
    id: 'fact_1',
    source: 'dns_lookup',
    category: 'dns',
    key: 'nameserver',
    value: 'ns1.example.com',
    confidence: 0.9,
    discoveredAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createDiscoveryFact
// ---------------------------------------------------------------------------
describe('createDiscoveryFact', () => {
  it('creates a fact with all fields populated', () => {
    const fact = createDiscoveryFact({
      id: 'f1',
      source: 'whois',
      category: 'domain',
      key: 'registrar',
      value: 'Example Registrar',
      confidence: 0.95,
      discoveredAt: 1000,
    });
    expect(fact.id).toBe('f1');
    expect(fact.source).toBe('whois');
    expect(fact.category).toBe('domain');
    expect(fact.confidence).toBe(0.95);
    expect(fact.discoveredAt).toBe(1000);
  });

  it('defaults discoveredAt to current timestamp when omitted', () => {
    const before = Date.now();
    const fact = createDiscoveryFact({
      id: 'f2',
      source: 'dns',
      category: 'dns',
      key: 'ns',
      value: 'ns1',
      confidence: 0.8,
    });
    expect(fact.discoveredAt).toBeGreaterThanOrEqual(before);
    expect(fact.discoveredAt).toBeLessThanOrEqual(Date.now());
  });

  it('throws RangeError when confidence is below 0', () => {
    expect(() =>
      createDiscoveryFact({ id: 'f3', source: 's', category: 'dns', key: 'k', value: 'v', confidence: -0.1 }),
    ).toThrow(RangeError);
  });

  it('throws RangeError when confidence is above 1', () => {
    expect(() =>
      createDiscoveryFact({ id: 'f4', source: 's', category: 'dns', key: 'k', value: 'v', confidence: 1.1 }),
    ).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// computeOverallConfidence
// ---------------------------------------------------------------------------
describe('computeOverallConfidence', () => {
  it('returns 0 for an empty facts array', () => {
    expect(computeOverallConfidence([])).toBe(0);
  });

  it('returns the single fact confidence for a one-element array', () => {
    expect(computeOverallConfidence([makeFact({ confidence: 0.7 })])).toBe(0.7);
  });

  it('returns the average confidence for multiple facts', () => {
    const facts = [
      makeFact({ id: 'a', confidence: 0.6 }),
      makeFact({ id: 'b', confidence: 0.9 }),
    ];
    expect(computeOverallConfidence(facts)).toBe(0.75);
  });

  it('handles facts with confidence 0 and 1', () => {
    const facts = [
      makeFact({ id: 'a', confidence: 0 }),
      makeFact({ id: 'b', confidence: 1 }),
    ];
    expect(computeOverallConfidence(facts)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// computeCategoryConfidence
// ---------------------------------------------------------------------------
describe('computeCategoryConfidence', () => {
  it('computes confidence for only the specified category', () => {
    const facts = [
      makeFact({ id: 'a', category: 'dns', confidence: 0.8 }),
      makeFact({ id: 'b', category: 'server', confidence: 0.4 }),
      makeFact({ id: 'c', category: 'dns', confidence: 0.6 }),
    ];
    expect(computeCategoryConfidence(facts, 'dns')).toBe(0.7);
  });

  it('returns 0 when no facts match the category', () => {
    expect(computeCategoryConfidence([makeFact({ category: 'dns' })], 'server')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateFact
// ---------------------------------------------------------------------------
describe('validateFact', () => {
  it('returns empty array for a valid fact', () => {
    expect(validateFact(makeFact())).toEqual([]);
  });

  it('returns errors for missing id', () => {
    const errors = validateFact(makeFact({ id: '' }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/id/);
  });

  it('returns errors for confidence out of range', () => {
    const fact = { ...makeFact(), confidence: 1.5 };
    const errors = validateFact(fact);
    expect(errors.some((e) => e.includes('confidence'))).toBe(true);
  });

  it('returns errors for empty key', () => {
    const errors = validateFact(makeFact({ key: '' }));
    expect(errors.some((e) => e.includes('key'))).toBe(true);
  });

  it('returns errors for empty value', () => {
    const errors = validateFact(makeFact({ value: '' }));
    expect(errors.some((e) => e.includes('value'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateHumanSummary
// ---------------------------------------------------------------------------
describe('generateHumanSummary', () => {
  it('returns a no-facts message when facts array is empty', () => {
    expect(generateHumanSummary('example.com', [])).toBe('No hosting facts discovered for example.com.');
  });

  it('includes category counts and confidence', () => {
    const summary = generateHumanSummary('example.com', [
      makeFact({ id: 'a', category: 'dns', confidence: 0.8 }),
      makeFact({ id: 'b', category: 'dns', confidence: 0.6 }),
    ]);
    expect(summary).toContain('dns: 2 fact(s)');
    expect(summary).toContain('avg confidence');
  });

  it('includes overall summary line', () => {
    const summary = generateHumanSummary('example.com', [makeFact()]);
    expect(summary).toContain('Overall:');
  });
});

// ---------------------------------------------------------------------------
// collectHostingTruth
// ---------------------------------------------------------------------------
describe('collectHostingTruth', () => {
  it('returns a DeployTruthArtifact and CollectorRunLog', () => {
    const result = collectHostingTruth('example.com', [makeFact()]);
    expect(result.artifact).toBeDefined();
    expect(result.runLog).toBeDefined();
  });

  it('artifact contains the domain', () => {
    const result = collectHostingTruth('test.dev', [makeFact()]);
    expect(result.artifact.domain).toBe('test.dev');
  });

  it('artifact.facts contains only valid facts', () => {
    const invalid = { ...makeFact({ id: 'bad' }), confidence: 5 };
    const valid = makeFact({ id: 'good' });
    const result = collectHostingTruth('example.com', [invalid, valid]);
    expect(result.artifact.facts).toHaveLength(1);
    expect(result.artifact.facts[0].id).toBe('good');
  });

  it('artifact.overallConfidence matches computed confidence', () => {
    const facts = [makeFact({ id: 'a', confidence: 0.8 }), makeFact({ id: 'b', confidence: 0.6 })];
    const result = collectHostingTruth('example.com', facts);
    expect(result.artifact.overallConfidence).toBe(0.7);
  });

  it('artifact.humanSummary is non-empty', () => {
    const result = collectHostingTruth('example.com', [makeFact()]);
    expect(result.artifact.humanSummary.length).toBeGreaterThan(0);
  });

  it('runLog.factsCollected matches number of valid facts', () => {
    const result = collectHostingTruth('example.com', [makeFact(), makeFact({ id: 'f2' })]);
    expect(result.runLog.factsCollected).toBe(2);
  });

  it('runLog.steps is a non-empty array', () => {
    const result = collectHostingTruth('example.com', [makeFact()]);
    expect(result.runLog.steps.length).toBeGreaterThan(0);
    expect(result.runLog.steps[0].name).toBeDefined();
  });

  it('runLog.errors contains validation error messages for invalid facts', () => {
    const invalid = { ...makeFact({ id: 'bad' }), confidence: -1 };
    const result = collectHostingTruth('example.com', [invalid]);
    expect(result.runLog.errors.length).toBeGreaterThan(0);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it('runLog.completedAt >= runLog.startedAt', () => {
    const result = collectHostingTruth('example.com', [makeFact()]);
    expect(result.runLog.completedAt).toBeGreaterThanOrEqual(result.runLog.startedAt);
  });

  it('handles empty facts array gracefully', () => {
    const result = collectHostingTruth('example.com', []);
    expect(result.artifact.facts).toHaveLength(0);
    expect(result.artifact.overallConfidence).toBe(0);
    expect(result.runLog.factsCollected).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createApprovalRecord
// ---------------------------------------------------------------------------
describe('createApprovalRecord', () => {
  it('creates a record with status pending', () => {
    const record = createApprovalRecord('truth_123');
    expect(record.status).toBe('pending');
  });

  it('links to the correct truthArtifactId', () => {
    const record = createApprovalRecord('truth_abc');
    expect(record.truthArtifactId).toBe('truth_abc');
  });

  it('reviewer, reviewedAt, and notes are null', () => {
    const record = createApprovalRecord('truth_123');
    expect(record.reviewer).toBeNull();
    expect(record.reviewedAt).toBeNull();
    expect(record.notes).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveApproval
// ---------------------------------------------------------------------------
describe('resolveApproval', () => {
  it('sets status to approved with reviewer and timestamp', () => {
    const pending = createApprovalRecord('truth_1');
    const resolved = resolveApproval(pending, { status: 'approved', reviewer: 'ops_team' });
    expect(resolved.status).toBe('approved');
    expect(resolved.reviewer).toBe('ops_team');
    expect(resolved.reviewedAt).toBeGreaterThan(0);
  });

  it('sets status to rejected with reviewer and notes', () => {
    const pending = createApprovalRecord('truth_1');
    const resolved = resolveApproval(pending, {
      status: 'rejected',
      reviewer: 'admin',
      notes: 'Confidence too low',
    });
    expect(resolved.status).toBe('rejected');
    expect(resolved.notes).toBe('Confidence too low');
  });

  it('does not mutate the original record', () => {
    const pending = createApprovalRecord('truth_1');
    resolveApproval(pending, { status: 'approved', reviewer: 'admin' });
    expect(pending.status).toBe('pending');
    expect(pending.reviewer).toBeNull();
  });
});
