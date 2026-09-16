import {
  deepestAvailableMetric,
  evaluateCapacityGate,
  validateConstraintRecord,
  type ConstraintRecord,
} from '../packages/core/src/throughput';

describe('contractor throughput model', () => {
  it('accepts a valid trust constraint record', () => {
    const record: ConstraintRecord = {
      id: 'trust_001',
      category: 'trust',
      stage: 'evaluation',
      status: 'active',
      hypothesis: 'Qualified visitors lack enough local project proof to request an estimate confidently.',
      evidence: ['strong organic traffic', 'few project pages', 'low qualified-lead conversion'],
      throughputMetric: { primary: 'qualified_lead_rate' },
      supportingMetrics: ['project_page_engagement', 'cta_rate'],
      interventions: ['add verified local project pages', 'move verified proof higher on service pages'],
      protectedFacts: ['service claims', 'licenses', 'customer quotes'],
      confidence: 'medium',
    };

    expect(validateConstraintRecord(record)).toEqual([]);
  });

  it('rejects a constraint record without evidence or an intervention', () => {
    const record = {
      id: 'response_001',
      category: 'response',
      stage: 'lead_response',
      status: 'active',
      hypothesis: 'Lead response is limiting throughput.',
      evidence: [],
      throughputMetric: { primary: 'answered_qualified_lead_rate' },
      interventions: [],
    } as ConstraintRecord;

    expect(validateConstraintRecord(record)).toEqual(expect.arrayContaining([
      'constraint.evidence requires at least one evidence item',
      'constraint.interventions requires at least one intervention',
    ]));
  });

  it('suppresses demand expansion when demand pressure is near capacity', () => {
    const result = evaluateCapacityGate({
      currentCompletedJobs: 28,
      estimatedSustainableCapacity: 35,
      demandPressure: 'near_capacity',
    });

    expect(result.suppressDemandExpansion).toBe(true);
    expect(result.reason).toContain('near_capacity');
  });

  it('suppresses demand expansion when current completed jobs meet capacity', () => {
    const result = evaluateCapacityGate({
      currentCompletedJobs: 35,
      estimatedSustainableCapacity: 35,
      demandPressure: 'balanced',
    });

    expect(result.suppressDemandExpansion).toBe(true);
    expect(result.reason).toContain('meet or exceed');
  });

  it('does not pretend unknown capacity is safe for demand expansion', () => {
    const result = evaluateCapacityGate({ demandPressure: 'unknown' });
    expect(result.suppressDemandExpansion).toBe(false);
    expect(result.reason).toContain('diagnose capacity');
  });

  it('uses the deepest reliable business outcome available before vanity metrics', () => {
    const selected = deepestAvailableMetric({
      cta_click: 120,
      qualified_phone_call: 14,
      qualified_lead: 9,
      closed_job: 3,
    });

    expect(selected).toBe('closed_job');
  });
});
