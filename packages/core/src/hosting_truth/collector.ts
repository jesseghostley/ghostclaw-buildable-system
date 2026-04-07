import type {
  DiscoveryFact,
  DeployTruthArtifact,
  ApprovalRecord,
  CollectorRunLog,
  CollectorStep,
} from './types';
import {
  computeOverallConfidence,
  generateHumanSummary,
  validateFact,
} from './evidence';

export type CollectorResult = {
  artifact: DeployTruthArtifact;
  runLog: CollectorRunLog;
  validationErrors: string[];
};

function step(name: string, fn: () => void): CollectorStep {
  const startedAt = Date.now();
  fn();
  return { name, startedAt, completedAt: Date.now() };
}

/**
 * Collect hosting truth for a domain from pre-supplied facts.
 *
 * Steps: validate → filter valid → compute confidence → generate summary → build artifact + run log.
 * No live discovery, I/O, or database writes.
 */
export function collectHostingTruth(
  domain: string,
  facts: DiscoveryFact[],
): CollectorResult {
  const startedAt = Date.now();
  const steps: CollectorStep[] = [];
  const allErrors: string[] = [];
  let validFacts: DiscoveryFact[] = [];
  let overallConfidence = 0;
  let humanSummary = '';

  steps.push(step('validate_facts', () => {
    for (const fact of facts) {
      const errors = validateFact(fact);
      if (errors.length > 0) {
        allErrors.push(...errors.map((e) => `[${fact.id || 'unknown'}] ${e}`));
      }
    }
  }));

  steps.push(step('filter_valid_facts', () => {
    validFacts = facts.filter((f) => validateFact(f).length === 0);
  }));

  steps.push(step('compute_confidence', () => {
    overallConfidence = computeOverallConfidence(validFacts);
  }));

  steps.push(step('generate_summary', () => {
    humanSummary = generateHumanSummary(domain, validFacts);
  }));

  const artifact: DeployTruthArtifact = {
    id: `truth_${domain}_${startedAt}`,
    domain,
    facts: validFacts,
    overallConfidence,
    humanSummary,
    createdAt: Date.now(),
  };

  steps.push(step('build_artifact', () => { /* artifact already built above */ }));

  const completedAt = Date.now();

  const runLog: CollectorRunLog = {
    id: `run_${domain}_${startedAt}`,
    domain,
    startedAt,
    completedAt,
    factsCollected: validFacts.length,
    errors: allErrors,
    steps,
  };

  return { artifact, runLog, validationErrors: allErrors };
}

/** Create a pending ApprovalRecord for a truth artifact. */
export function createApprovalRecord(truthArtifactId: string): ApprovalRecord {
  return {
    id: `approval_${truthArtifactId}_${Date.now()}`,
    truthArtifactId,
    status: 'pending',
    reviewer: null,
    reviewedAt: null,
    notes: null,
  };
}

/** Resolve an approval. Returns a new record (does not mutate input). */
export function resolveApproval(
  record: ApprovalRecord,
  decision: { status: 'approved' | 'rejected'; reviewer: string; notes?: string },
): ApprovalRecord {
  return {
    ...record,
    status: decision.status,
    reviewer: decision.reviewer,
    reviewedAt: Date.now(),
    notes: decision.notes ?? null,
  };
}
