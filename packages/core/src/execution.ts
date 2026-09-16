export type ExecutionQueue = 'now' | 'waiting' | 'scheduled' | 'later' | 'completed' | 'cancelled';
export type CommitmentState = 'active' | 'passive';
export type IntegrityState = 'healthy' | 'orphaned' | 'overdue' | 'stale' | 'blocked';
export type Trigger =
  | { type: 'time'; at: string }
  | { type: 'event'; event: string };

export type ProvenanceKind =
  | 'explicit_fact'
  | 'system_observed'
  | 'ai_inference'
  | 'uncertain_assumption'
  | 'human_approved';

export type ExecutionRecord = {
  objectId: string;
  objectType: string;
  commitmentState: CommitmentState;
  queue: ExecutionQueue;
  owner?: string;
  nextAction?: string;
  waitingOn?: string;
  scheduledTrigger?: Trigger;
  dueAt?: string;
  source?: string;
  relatedClient?: string;
  relatedProject?: string;
  relatedConstraint?: string;
  relatedIntervention?: string;
  provenance?: ProvenanceKind;
  actionConfidence?: 'low' | 'moderate' | 'high' | 'explicit';
  approvalState?: 'not_required' | 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
};

export type IntegrityResult = {
  integrityState: IntegrityState;
  reasons: string[];
};

function isTerminalQueue(queue: ExecutionQueue): boolean {
  return queue === 'completed' || queue === 'cancelled';
}

function hasForwardMotion(record: ExecutionRecord): boolean {
  return Boolean(
    record.nextAction?.trim() ||
    record.waitingOn?.trim() ||
    record.scheduledTrigger,
  );
}

export function evaluateExecutionIntegrity(
  record: ExecutionRecord,
  now = new Date(),
): IntegrityResult {
  const reasons: string[] = [];

  if (isTerminalQueue(record.queue)) {
    return { integrityState: 'healthy', reasons };
  }

  if (record.commitmentState === 'active') {
    if (!record.owner?.trim()) reasons.push('active_commitment_missing_owner');
    if (!hasForwardMotion(record)) reasons.push('active_commitment_has_no_forward_motion');
  }

  if (record.queue === 'waiting' && !record.waitingOn?.trim()) {
    reasons.push('waiting_queue_missing_dependency');
  }

  if (record.queue === 'scheduled' && !record.scheduledTrigger) {
    reasons.push('scheduled_queue_missing_trigger');
  }

  if (record.dueAt) {
    const due = new Date(record.dueAt);
    if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
      reasons.push('due_date_passed');
    }
  }

  if (reasons.includes('active_commitment_missing_owner') || reasons.includes('active_commitment_has_no_forward_motion')) {
    return { integrityState: 'orphaned', reasons };
  }

  if (reasons.includes('due_date_passed')) {
    return { integrityState: 'overdue', reasons };
  }

  if (reasons.includes('waiting_queue_missing_dependency') || reasons.includes('scheduled_queue_missing_trigger')) {
    return { integrityState: 'blocked', reasons };
  }

  return { integrityState: 'healthy', reasons };
}

export function isExecutableNextAction(value?: string): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  const vaguePrefixes = [
    'improve ',
    'increase ',
    'fix marketing',
    'grow ',
    'work on ',
    'handle ',
    'optimize business',
  ];
  return !vaguePrefixes.some((prefix) => normalized.startsWith(prefix));
}
