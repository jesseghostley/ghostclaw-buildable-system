import type { DiscoveryFact, DiscoveryCategory } from './types';

const VALID_CATEGORIES: ReadonlySet<string> = new Set<string>([
  'dns', 'server', 'certificate', 'hosting_provider', 'domain',
]);

/**
 * Create a DiscoveryFact. Defaults discoveredAt to Date.now().
 * Throws RangeError if confidence is outside [0, 1].
 */
export function createDiscoveryFact(
  params: Omit<DiscoveryFact, 'discoveredAt'> & { discoveredAt?: number },
): DiscoveryFact {
  if (params.confidence < 0 || params.confidence > 1) {
    throw new RangeError(`confidence must be between 0 and 1, got ${params.confidence}`);
  }
  return {
    ...params,
    discoveredAt: params.discoveredAt ?? Date.now(),
  };
}

/**
 * Arithmetic mean of fact confidences. Returns 0 for empty array.
 * Rounded to 4 decimal places to avoid floating-point noise.
 */
export function computeOverallConfidence(facts: DiscoveryFact[]): number {
  if (facts.length === 0) return 0;
  const sum = facts.reduce((acc, f) => acc + f.confidence, 0);
  return Math.round((sum / facts.length) * 10000) / 10000;
}

/** Confidence for a specific category of facts. */
export function computeCategoryConfidence(
  facts: DiscoveryFact[],
  category: DiscoveryCategory,
): number {
  return computeOverallConfidence(facts.filter((f) => f.category === category));
}

/**
 * Human-readable summary grouped by category with counts and confidence.
 */
export function generateHumanSummary(domain: string, facts: DiscoveryFact[]): string {
  if (facts.length === 0) {
    return `No hosting facts discovered for ${domain}.`;
  }

  const groups = new Map<string, DiscoveryFact[]>();
  for (const fact of facts) {
    const existing = groups.get(fact.category) ?? [];
    existing.push(fact);
    groups.set(fact.category, existing);
  }

  const lines: string[] = [];
  for (const [category, categoryFacts] of groups) {
    const avg = computeOverallConfidence(categoryFacts);
    lines.push(`${category}: ${categoryFacts.length} fact(s) (avg confidence: ${avg})`);
  }

  const overall = computeOverallConfidence(facts);
  lines.push(`Overall: ${facts.length} fact(s) across ${groups.size} category(ies) (confidence: ${overall})`);

  return lines.join('\n');
}

/** Validate a fact. Returns an array of error strings (empty = valid). */
export function validateFact(fact: DiscoveryFact): string[] {
  const errors: string[] = [];
  if (!fact.id) errors.push('id must be a non-empty string');
  if (!fact.source) errors.push('source must be a non-empty string');
  if (!fact.key) errors.push('key must be a non-empty string');
  if (!fact.value) errors.push('value must be a non-empty string');
  if (typeof fact.confidence !== 'number' || fact.confidence < 0 || fact.confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }
  if (!VALID_CATEGORIES.has(fact.category)) {
    errors.push(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
  }
  return errors;
}
