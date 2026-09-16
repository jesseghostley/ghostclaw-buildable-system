export const CONSTRAINT_CATEGORIES = [
  'market',
  'visibility',
  'trust',
  'conversion',
  'response',
  'appointment',
  'estimate',
  'sales',
  'capacity',
  'reputation',
  'follow_up',
  'leadership_process',
] as const;

export type ConstraintCategory = (typeof CONSTRAINT_CATEGORIES)[number];

export const CONSTRAINT_STATUSES = [
  'candidate',
  'diagnosing',
  'active',
  'being_exploited',
  'testing_intervention',
  'relieved',
  'superseded',
  'inconclusive',
] as const;

export type ConstraintStatus = (typeof CONSTRAINT_STATUSES)[number];

export type ConstraintRecord = {
  id: string;
  category: ConstraintCategory;
  stage: string;
  status: ConstraintStatus;
  hypothesis: string;
  evidence: string[];
  throughputMetric: { primary: string };
  supportingMetrics?: string[];
  interventions: string[];
  protectedFacts?: string[];
  confidence?: 'low' | 'medium' | 'high';
};

export const DEMAND_PRESSURE_STATES = [
  'underutilized',
  'balanced',
  'near_capacity',
  'over_capacity',
  'unknown',
] as const;

export type DemandPressure = (typeof DEMAND_PRESSURE_STATES)[number];

export type CapacityRecord = {
  currentCompletedJobs?: number;
  estimatedSustainableCapacity?: number;
  period?: string;
  demandPressure: DemandPressure;
  suppressDemandExpansion?: boolean;
  source?: string;
  confidence?: 'low' | 'medium' | 'high';
};

export type CapacityGateResult = {
  suppressDemandExpansion: boolean;
  reason: string;
};

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateConstraintRecord(record: ConstraintRecord): string[] {
  const errors: string[] = [];
  if (!nonEmpty(record.id)) errors.push('constraint.id is required');
  if (!CONSTRAINT_CATEGORIES.includes(record.category)) errors.push('constraint.category is invalid');
  if (!nonEmpty(record.stage)) errors.push('constraint.stage is required');
  if (!CONSTRAINT_STATUSES.includes(record.status)) errors.push('constraint.status is invalid');
  if (!nonEmpty(record.hypothesis)) errors.push('constraint.hypothesis is required');
  if (!Array.isArray(record.evidence) || record.evidence.length === 0 || record.evidence.some((item) => !nonEmpty(item))) {
    errors.push('constraint.evidence requires at least one evidence item');
  }
  if (!record.throughputMetric || !nonEmpty(record.throughputMetric.primary)) {
    errors.push('constraint.throughputMetric.primary is required');
  }
  if (!Array.isArray(record.interventions) || record.interventions.length === 0 || record.interventions.some((item) => !nonEmpty(item))) {
    errors.push('constraint.interventions requires at least one intervention');
  }
  return errors;
}

export function evaluateCapacityGate(capacity: CapacityRecord): CapacityGateResult {
  if (!DEMAND_PRESSURE_STATES.includes(capacity.demandPressure)) {
    throw new Error('capacity.demandPressure is invalid');
  }
  if (capacity.currentCompletedJobs !== undefined && !finiteNonNegative(capacity.currentCompletedJobs)) {
    throw new Error('capacity.currentCompletedJobs must be a non-negative finite number');
  }
  if (capacity.estimatedSustainableCapacity !== undefined && !finiteNonNegative(capacity.estimatedSustainableCapacity)) {
    throw new Error('capacity.estimatedSustainableCapacity must be a non-negative finite number');
  }

  if (capacity.suppressDemandExpansion === true) {
    return { suppressDemandExpansion: true, reason: 'capacity record explicitly suppresses upstream demand expansion' };
  }

  if (capacity.demandPressure === 'near_capacity' || capacity.demandPressure === 'over_capacity') {
    return {
      suppressDemandExpansion: true,
      reason: `demand pressure is ${capacity.demandPressure}`,
    };
  }

  if (
    capacity.currentCompletedJobs !== undefined &&
    capacity.estimatedSustainableCapacity !== undefined &&
    capacity.estimatedSustainableCapacity > 0 &&
    capacity.currentCompletedJobs >= capacity.estimatedSustainableCapacity
  ) {
    return {
      suppressDemandExpansion: true,
      reason: 'current completed jobs meet or exceed estimated sustainable capacity',
    };
  }

  if (capacity.demandPressure === 'unknown') {
    return {
      suppressDemandExpansion: false,
      reason: 'capacity is unknown; diagnose capacity before prescribing demand expansion',
    };
  }

  return {
    suppressDemandExpansion: false,
    reason: `demand pressure is ${capacity.demandPressure}`,
  };
}

export const DOWNSTREAM_METRIC_ORDER = [
  'profitable_completed_job',
  'revenue',
  'closed_job',
  'qualified_lead',
  'booked_appointment',
  'completed_intake',
  'qualified_phone_call',
] as const;

export function deepestAvailableMetric(metrics: Record<string, number | null | undefined>): string | null {
  for (const metric of DOWNSTREAM_METRIC_ORDER) {
    const value = metrics[metric];
    if (typeof value === 'number' && Number.isFinite(value)) return metric;
  }
  return null;
}
