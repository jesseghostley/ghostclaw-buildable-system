import { evaluateSla, scanSlaBreaches, type SlaRule } from '../packages/core/src/sla';

const responseRule: SlaRule = {
  id: 'lead_first_response',
  objectType: 'lead',
  transition: 'received_to_first_response',
  targetMinutes: 15,
  escalationOwner: 'sales_manager',
  recoveryAction: 'Trigger missed-lead recovery workflow',
  severity: 'critical',
};

describe('SLA state-transition monitoring', () => {
  it('keeps an active transition within SLA before target time', () => {
    const result = evaluateSla(responseRule, {
      objectId: 'lead_1',
      objectType: 'lead',
      transition: 'received_to_first_response',
      startedAt: '2026-09-16T12:00:00Z',
    }, new Date('2026-09-16T12:10:00Z'));

    expect(result.status).toBe('within_sla');
    expect(result.breachMinutes).toBe(0);
  });

  it('detects a breached active transition and exposes recovery metadata', () => {
    const result = evaluateSla(responseRule, {
      objectId: 'lead_2',
      objectType: 'lead',
      transition: 'received_to_first_response',
      startedAt: '2026-09-16T12:00:00Z',
    }, new Date('2026-09-16T12:25:00Z'));

    expect(result.status).toBe('breached');
    expect(result.breachMinutes).toBe(10);
    expect(result.escalationOwner).toBe('sales_manager');
    expect(result.recoveryAction).toContain('missed-lead recovery');
  });

  it('distinguishes a completed late transition from an active breach', () => {
    const result = evaluateSla(responseRule, {
      objectId: 'lead_3',
      objectType: 'lead',
      transition: 'received_to_first_response',
      startedAt: '2026-09-16T12:00:00Z',
      completedAt: '2026-09-16T12:20:00Z',
    });

    expect(result.status).toBe('completed_after_sla');
    expect(result.breachMinutes).toBe(5);
  });

  it('scans only observations with matching SLA rules', () => {
    const results = scanSlaBreaches([responseRule], [
      {
        objectId: 'lead_4',
        objectType: 'lead',
        transition: 'received_to_first_response',
        startedAt: '2026-09-16T12:00:00Z',
      },
      {
        objectId: 'invoice_1',
        objectType: 'invoice',
        transition: 'sent_to_paid',
        startedAt: '2026-09-16T12:00:00Z',
      },
    ], new Date('2026-09-16T12:30:00Z'));

    expect(results).toHaveLength(1);
    expect(results[0].objectId).toBe('lead_4');
  });

  it('rejects mismatched rule and observation types', () => {
    expect(() => evaluateSla(responseRule, {
      objectId: 'estimate_1',
      objectType: 'estimate',
      transition: 'received_to_first_response',
      startedAt: '2026-09-16T12:00:00Z',
    })).toThrow('objectType');
  });
});
