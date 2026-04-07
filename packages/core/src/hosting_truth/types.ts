/** Category of a hosting discovery fact. */
export type DiscoveryCategory = 'dns' | 'server' | 'certificate' | 'hosting_provider' | 'domain';

/**
 * A single observed fact about a hosting environment.
 * Immutable after creation. Carries its own confidence score (0–1).
 */
export type DiscoveryFact = {
  id: string;
  source: string;
  category: DiscoveryCategory;
  key: string;
  value: string;
  confidence: number;
  discoveredAt: number;
};

/**
 * Structured summary of hosting truth for a domain.
 * This is a proposed artifact — it does NOT mutate any canonical deploy map.
 * Must be separately approved via an ApprovalRecord.
 */
export type DeployTruthArtifact = {
  id: string;
  domain: string;
  facts: DiscoveryFact[];
  overallConfidence: number;
  humanSummary: string;
  createdAt: number;
};

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Tracks whether a truth artifact has been approved, rejected, or is pending.
 * Intentionally decoupled from DeployTruthArtifact so truth data and
 * governance decisions are never conflated.
 */
export type ApprovalRecord = {
  id: string;
  truthArtifactId: string;
  status: ApprovalStatus;
  reviewer: string | null;
  reviewedAt: number | null;
  notes: string | null;
};

/** A single step recorded during a collector run. */
export type CollectorStep = {
  name: string;
  startedAt: number;
  completedAt: number;
};

/** Machine-readable log of a single collection run. */
export type CollectorRunLog = {
  id: string;
  domain: string;
  startedAt: number;
  completedAt: number;
  factsCollected: number;
  errors: string[];
  steps: CollectorStep[];
};
