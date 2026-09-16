import {
  canCompleteIntervention,
  canEnterMeasuring,
  InterventionRecord,
  validateIntervention,
} from '../packages/core/src/intervention';

function base(): InterventionRecord {
  return {
    id: 'response_001_impl',
    constraintId: 'response_001',
    type: 'implementation',
    status: 'executing',
    title: 'Configure missed-call recovery',
    owner: 'ops',
    nextAction: 'Configure SMS acknowledgement and callback task workflow',
    successMetric: 'median_first_response_time',
    baseline: 18,
    approvalState: 'approved',
  };
}

describe('intervention runtime model', () => {
  it('accepts an executable implementation tied to a constraint', () => {
    expect(validateIntervention(base())).toEqual([]);
  });

  it('distinguishes a fix from an experiment', () => {
    const fix = { ...base(), type: 'fix' as const, title: 'Repair broken lead form' };
    expect(validateIntervention(fix)).toEqual([]);
  });

  it('requires experiment interventions to reference an experiment', () => {
    const intervention = { ...base(), type: 'experiment' as const };
    expect(validateIntervention(intervention)).toContain('experiment intervention requires experimentId');
  });

  it('requires active interventions to have accountable forward motion', () => {
    const intervention = { ...base(), owner: undefined, nextAction: undefined };
    const errors = validateIntervention(intervention);
    expect(errors).toContain('active intervention requires owner');
    expect(errors).toContain('active intervention requires next action, waiting condition, or trigger');
  });

  it('allows a waiting dependency as forward motion', () => {
    const intervention = { ...base(), nextAction: undefined, waitingOn: 'client photos' };
    expect(validateIntervention(intervention)).toEqual([]);
  });

  it('requires a baseline before entering measurement', () => {
    expect(canEnterMeasuring(base())).toBe(true);
    expect(canEnterMeasuring({ ...base(), baseline: undefined })).toBe(false);
  });

  it('requires an evidence-bearing outcome before completion', () => {
    expect(canCompleteIntervention({ ...base(), status: 'effective', outcome: 'Median response time fell from 18m to 6m.' })).toBe(true);
    expect(canCompleteIntervention({ ...base(), status: 'effective', outcome: undefined })).toBe(false);
    expect(canCompleteIntervention({ ...base(), status: 'executing', outcome: 'Too early' })).toBe(false);
  });
});
