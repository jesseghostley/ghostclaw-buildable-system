/**
 * Blueprint — a declarative automation recipe that the runtime can install
 * into a workspace and execute end-to-end.
 *
 * Blueprints are the primary unit of reusable automation in GhostClaw.
 * They define what agents, skills, jobs, and policies are needed to
 * accomplish a specific workflow.
 */

export type BlueprintStatus = 'draft' | 'active' | 'archived';

export type BlueprintJobStep = {
  /** Execution order (1-based). */
  order: number;
  /** Job type that maps to a registered skill handler. */
  jobType: string;
  /** Agent that should execute this step. */
  agentId: string;
  /** Skill invoked by this step. */
  skillId: string;
  /** Human-readable description of what this step does. */
  description: string;
  /** If true, output of this step feeds into the next step's input. */
  passOutputForward: boolean;
};

export type BlueprintApprovalGate = {
  /** Which step triggers the approval gate (by order number). */
  afterStep: number;
  /** Type of approval required. */
  type: 'operator' | 'auto' | 'policy';
  /** What is being approved. */
  description: string;
  /** Publish destination that requires approval. */
  destination?: string;
};

export type BlueprintInput = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
};

export type BlueprintOutput = {
  name: string;
  artifactType: string;
  description: string;
};

export type Blueprint = {
  id: string;
  name: string;
  version: string;
  description: string;
  status: BlueprintStatus;

  /** Signal name that triggers this blueprint. */
  triggerSignal: string;
  /** Planner action this blueprint maps to. */
  plannerAction: string;
  /** Strategy ID used for routing. */
  strategyId: string;

  /** Ordered list of job steps. */
  steps: BlueprintJobStep[];
  /** Required inputs from the triggering signal payload. */
  inputs: BlueprintInput[];
  /** Expected outputs (artifacts). */
  outputs: BlueprintOutput[];
  /** Approval gates in the pipeline. */
  approvalGates: BlueprintApprovalGate[];

  /** Agent IDs required by this blueprint. */
  requiredAgents: string[];
  /** Skill IDs required by this blueprint. */
  requiredSkills: string[];

  /** Queue execution mode. */
  queueType: 'sequential' | 'parallel' | 'priority';

  /** Audit events this blueprint emits. */
  auditEvents: string[];

  /** Memory keys to persist after execution. */
  memoryKeys: string[];

  createdAt: number;
  updatedAt: number;
};
