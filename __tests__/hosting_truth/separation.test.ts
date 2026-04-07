import type { DiscoveryFact } from '../../packages/core/src/hosting_truth/types';
import { collectHostingTruth, createApprovalRecord, resolveApproval } from '../../packages/core/src/hosting_truth/collector';

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

describe('Truth artifact and approval record separation', () => {
  it('DeployTruthArtifact does not contain approval fields', () => {
    const { artifact } = collectHostingTruth('example.com', [makeFact()]);
    const keys = Object.keys(artifact);
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('reviewer');
    expect(keys).not.toContain('reviewedAt');
    expect(keys).not.toContain('notes');
  });

  it('ApprovalRecord does not contain truth content fields', () => {
    const record = createApprovalRecord('truth_1');
    const keys = Object.keys(record);
    expect(keys).not.toContain('facts');
    expect(keys).not.toContain('overallConfidence');
    expect(keys).not.toContain('humanSummary');
    expect(keys).not.toContain('domain');
  });

  it('ApprovalRecord references artifact by ID only', () => {
    const { artifact } = collectHostingTruth('example.com', [makeFact()]);
    const record = createApprovalRecord(artifact.id);
    expect(record.truthArtifactId).toBe(artifact.id);
    // No embedded copy of the artifact
    const values = Object.values(record);
    const hasArray = values.some((v) => Array.isArray(v));
    expect(hasArray).toBe(false);
  });

  it('modifying an approval record does not affect the truth artifact', () => {
    const { artifact } = collectHostingTruth('example.com', [makeFact()]);
    const originalConfidence = artifact.overallConfidence;
    const originalSummary = artifact.humanSummary;
    const originalFactsLength = artifact.facts.length;

    const approval = createApprovalRecord(artifact.id);
    resolveApproval(approval, { status: 'approved', reviewer: 'ops' });

    expect(artifact.overallConfidence).toBe(originalConfidence);
    expect(artifact.humanSummary).toBe(originalSummary);
    expect(artifact.facts.length).toBe(originalFactsLength);
  });

  it('multiple approval records can reference the same artifact', () => {
    const { artifact } = collectHostingTruth('example.com', [makeFact()]);

    const approval1 = createApprovalRecord(artifact.id);
    const approval2 = createApprovalRecord(artifact.id);

    const resolved1 = resolveApproval(approval1, { status: 'approved', reviewer: 'alice' });
    const resolved2 = resolveApproval(approval2, { status: 'rejected', reviewer: 'bob', notes: 'Needs more data' });

    expect(resolved1.truthArtifactId).toBe(artifact.id);
    expect(resolved2.truthArtifactId).toBe(artifact.id);
    expect(resolved1.status).toBe('approved');
    expect(resolved2.status).toBe('rejected');

    // Artifact unchanged
    expect(artifact.facts.length).toBeGreaterThan(0);
  });

  it('truth artifact is valid without any approval record existing', () => {
    const { artifact } = collectHostingTruth('example.com', [
      makeFact({ id: 'f1', confidence: 0.85 }),
    ]);
    expect(artifact.id).toBeDefined();
    expect(artifact.domain).toBe('example.com');
    expect(artifact.facts.length).toBe(1);
    expect(artifact.overallConfidence).toBe(0.85);
    expect(artifact.humanSummary.length).toBeGreaterThan(0);
    expect(artifact.createdAt).toBeGreaterThan(0);
  });

  it('approval record can be created in pending state independently', () => {
    const record = createApprovalRecord('truth_nonexistent_999');
    expect(record.truthArtifactId).toBe('truth_nonexistent_999');
    expect(record.status).toBe('pending');
    expect(record.reviewer).toBeNull();
    expect(record.reviewedAt).toBeNull();
    expect(record.notes).toBeNull();
  });
});
