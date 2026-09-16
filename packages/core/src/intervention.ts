export const INTERVENTION_TYPES = ['fix', 'implementation', 'experiment'] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_STATUSES = [
  'candidate',
  'approved',
  'planned',
  'executing',
  'measuring',
  'effective',
  'ineffective',
  'completed',
  'superseded',
  'cancelled',
] as const;
export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export type InterventionConfidence = 'low' | 'moderate' | 'high';

export type InterventionRecord = {
  id: string;
  constraintId: string;
  type: InterventionType;
  status: InterventionStatus;
  title: string;
  probableCause?: string;
  owner?: string;
  nextAction?: string;
  waitingOn?: string;
  scheduledTrigger?: { type: 'time'; at: string } | { type: 'event'; event: string };
  successMetric: string;
  baseline?: number;
  target?: number;
  evidenceRequirements?: string[];
  stopCondition?: string;
  reviewDate?: string;
  outcome?: string;
  confidence?: InterventionConfidence;
  approvalState?: 'not_required' | 'pending' | 'approved' | 'rejected';
  experimentId?: string;
};

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateIntervention(record: InterventionRecord): string[] {
  const errors: string[] = [];
  if (!nonEmpty(record.id)) errors.push('intervention.id is required');
  if (!nonEmpty(record.constraintId)) errors.push('intervention.constraintId is required');
  if (!INTERVENTION_TYPES.includes(record.type)) errors.push('intervention.type is invalid');
  if (!INTERVENTION_STATUSES.includes(record.status)) errors.push('intervention.status is invalid');
  if (!nonEmpty(record.title)) errors.push('intervention.title is required');
  if (!nonEmpty(record.successMetric)) errors.push('intervention.successMetric is required');

  const active = !['candidate', 'completed', 'superseded', 'cancelled'].includes(record.status);
  if (active && !nonEmpty(record.owner)) errors.push('active intervention requires owner');
  if (
    active &&
    !nonEmpty(record.nextAction) &&
    !nonEmpty(record.waitingOn) &&
    !record.scheduledTrigger
  ) {
    errors.push('active intervention requires next action, waiting condition, or trigger');
  }

  if (record.type === 'experiment' && !nonEmpty(record.experimentId)) {
    errors.push('experiment intervention requires experimentId');
  }
  if (record.type !== 'experiment' && record.experimentId) {
    errors.push('non-experiment intervention must not reference experimentId');
  }

  if (record.status === 'approved' && record.approvalState && record.approvalState !== 'approved') {
    errors.push('approved intervention requires approvalState approved when approvalState is provided');
  }

  return errors;
}

export function canEnterMeasuring(record: InterventionRecord): boolean {
  return nonEmpty(record.successMetric) && record.baseline !== undefined;
}

export function canCompleteIntervention(record: InterventionRecord): boolean {
  return (
    record.status === 'effective' ||
    record.status === 'ineffective'
  ) && nonEmpty(record.outcome);
}
