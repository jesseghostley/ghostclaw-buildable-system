import {
  evaluateExecutionIntegrity,
  isExecutableNextAction,
  scanExecutionIntegrity,
  type ExecutionRecord,
} from '../packages/core/src/execution';

function base(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    objectId: 'lead_001',
    objectType: 'lead',
    commitmentState: 'active',
    queue: 'now',
    owner: 'sales_rep_1',
    nextAction: 'Call homeowner and confirm inspection availability',
    ...overrides,
  };
}

describe('execution integrity', () => {
  it('marks an active commitment with owner and next action healthy', () => {
    expect(evaluateExecutionIntegrity(base()).integrityState).toBe('healthy');
  });

  it('marks an active commitment without forward motion orphaned', () => {
    const result = evaluateExecutionIntegrity(base({ nextAction: undefined }));
    expect(result.integrityState).toBe('orphaned');
    expect(result.reasons).toContain('active_commitment_has_no_forward_motion');
  });

  it('marks an active commitment without an owner orphaned', () => {
    const result = evaluateExecutionIntegrity(base({ owner: undefined }));
    expect(result.integrityState).toBe('orphaned');
    expect(result.reasons).toContain('active_commitment_missing_owner');
  });

  it('allows a passive LATER item without a next action', () => {
    const result = evaluateExecutionIntegrity(base({
      commitmentState: 'passive',
      queue: 'later',
      owner: undefined,
      nextAction: undefined,
    }));
    expect(result.integrityState).toBe('healthy');
  });

  it('allows WAITING as forward motion when a dependency is explicit', () => {
    const result = evaluateExecutionIntegrity(base({
      queue: 'waiting',
      nextAction: undefined,
      waitingOn: 'State Farm estimate',
    }));
    expect(result.integrityState).toBe('healthy');
  });

  it('flags WAITING without a dependency', () => {
    const result = evaluateExecutionIntegrity(base({
      queue: 'waiting',
      nextAction: undefined,
      waitingOn: undefined,
    }));
    expect(result.integrityState).toBe('orphaned');
    expect(result.reasons).toContain('waiting_queue_missing_dependency');
  });

  it('allows SCHEDULED with an event trigger', () => {
    const result = evaluateExecutionIntegrity(base({
      queue: 'scheduled',
      nextAction: undefined,
      scheduledTrigger: { type: 'event', event: 'client_assets_received' },
    }));
    expect(result.integrityState).toBe('healthy');
  });

  it('marks passed due dates overdue when the commitment otherwise has forward motion', () => {
    const result = evaluateExecutionIntegrity(
      base({ dueAt: '2026-09-15T12:00:00Z' }),
      new Date('2026-09-16T12:00:00Z'),
    );
    expect(result.integrityState).toBe('overdue');
    expect(result.reasons).toContain('due_date_passed');
  });

  it('does not require forward motion for completed records', () => {
    const result = evaluateExecutionIntegrity(base({
      queue: 'completed',
      owner: undefined,
      nextAction: undefined,
    }));
    expect(result.integrityState).toBe('healthy');
  });

  it('reconciles multiple records into an operating-system integrity report', () => {
    const report = scanExecutionIntegrity([
      base({ objectId: 'lead_healthy' }),
      base({ objectId: 'lead_orphaned', nextAction: undefined }),
      base({ objectId: 'estimate_overdue', objectType: 'estimate', dueAt: '2026-09-15T12:00:00Z' }),
      base({ objectId: 'idea_later', commitmentState: 'passive', queue: 'later', owner: undefined, nextAction: undefined }),
    ], new Date('2026-09-16T12:00:00Z'));

    expect(report.total).toBe(4);
    expect(report.healthy).toBe(2);
    expect(report.orphaned).toBe(1);
    expect(report.overdue).toBe(1);
    expect(report.findings.map((item) => item.objectId)).toEqual(expect.arrayContaining(['lead_orphaned', 'estimate_overdue']));
  });
});

describe('next action quality', () => {
  it('recognizes an executable physical action', () => {
    expect(isExecutableNextAction('Request photos from three completed jobs')).toBe(true);
  });

  it('rejects vague project language as a next action', () => {
    expect(isExecutableNextAction('Improve contractor trust')).toBe(false);
    expect(isExecutableNextAction('Work on local SEO')).toBe(false);
  });
});
