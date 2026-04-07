/**
 * Behavioral tests for the new SQLite store implementations:
 * SqliteSignalStore, SqlitePlanStore, SqliteAssignmentStore.
 */
import Database from 'better-sqlite3';
import * as os from 'os';
import * as path from 'path';

import { SqliteSignalStore } from '../../packages/core/src/storage/sqlite/SqliteSignalStore';
import { SqlitePlanStore } from '../../packages/core/src/storage/sqlite/SqlitePlanStore';
import { SqliteAssignmentStore } from '../../packages/core/src/storage/sqlite/SqliteAssignmentStore';
import type { Signal, Plan } from '../../packages/core/src/runtime_loop';
import type { Assignment } from '../../packages/core/src/assignment';

function makeDb(): Database.Database {
  return new Database(path.join(os.tmpdir(), `ghostclaw-sqlite-test-${Date.now()}-${Math.random()}.db`));
}

// ─── SqliteSignalStore ─────────────────────────────────────────────────────

describe('SqliteSignalStore', () => {
  let store: SqliteSignalStore;

  beforeEach(() => {
    store = new SqliteSignalStore(makeDb());
  });

  const makeSignal = (overrides: Partial<Signal> = {}): Signal => ({
    id: 'signal_1',
    name: 'contractor_site_requested',
    payload: { sites: [{ businessName: 'Test' }] },
    createdAt: 1000,
    ...overrides,
  });

  it('creates and retrieves a signal', () => {
    const signal = makeSignal();
    store.create(signal);
    const retrieved = store.getById('signal_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('contractor_site_requested');
    expect(retrieved!.payload).toEqual({ sites: [{ businessName: 'Test' }] });
  });

  it('returns existing signal on duplicate create', () => {
    const signal = makeSignal();
    store.create(signal);
    const dup = store.create({ ...signal, name: 'different' });
    expect(dup.name).toBe('contractor_site_requested');
  });

  it('lists all signals', () => {
    store.create(makeSignal({ id: 's1' }));
    store.create(makeSignal({ id: 's2', name: 'keyword_opportunity_detected' }));
    expect(store.listAll()).toHaveLength(2);
  });

  it('handles signal with no payload', () => {
    store.create(makeSignal({ id: 's1', payload: undefined }));
    const retrieved = store.getById('s1');
    expect(retrieved!.payload).toBeUndefined();
  });

  it('resets clears all signals', () => {
    store.create(makeSignal());
    store.reset();
    expect(store.listAll()).toHaveLength(0);
  });
});

// ─── SqlitePlanStore ───────────────────────────────────────────────────────

describe('SqlitePlanStore', () => {
  let store: SqlitePlanStore;

  beforeEach(() => {
    store = new SqlitePlanStore(makeDb());
  });

  const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
    id: 'plan_1',
    signalId: 'signal_1',
    action: 'build_contractor_site',
    strategyId: 'rule_contractor_site_strategy',
    strategyType: 'rule',
    priority: 2,
    requiredAgents: ['website_builder_agent'],
    expectedOutputs: ['contractor_site_page'],
    createdAt: 1000,
    ...overrides,
  });

  it('creates and retrieves a plan', () => {
    const plan = makePlan();
    store.create(plan);
    const retrieved = store.getById('plan_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.action).toBe('build_contractor_site');
    expect(retrieved!.requiredAgents).toEqual(['website_builder_agent']);
  });

  it('returns existing plan on duplicate create', () => {
    store.create(makePlan());
    const dup = store.create({ ...makePlan(), action: 'generate_content_cluster' });
    expect(dup.action).toBe('build_contractor_site');
  });

  it('lists all plans', () => {
    store.create(makePlan({ id: 'p1' }));
    store.create(makePlan({ id: 'p2' }));
    expect(store.listAll()).toHaveLength(2);
  });

  it('lists plans by signal ID', () => {
    store.create(makePlan({ id: 'p1', signalId: 's1' }));
    store.create(makePlan({ id: 'p2', signalId: 's2' }));
    store.create(makePlan({ id: 'p3', signalId: 's1' }));
    expect(store.listBySignalId('s1')).toHaveLength(2);
    expect(store.listBySignalId('s2')).toHaveLength(1);
  });

  it('handles plan with no optional fields', () => {
    store.create(makePlan({ priority: undefined, requiredAgents: undefined, expectedOutputs: undefined }));
    const retrieved = store.getById('plan_1');
    expect(retrieved!.priority).toBeUndefined();
    expect(retrieved!.requiredAgents).toBeUndefined();
    expect(retrieved!.expectedOutputs).toBeUndefined();
  });

  it('resets clears all plans', () => {
    store.create(makePlan());
    store.reset();
    expect(store.listAll()).toHaveLength(0);
  });
});

// ─── SqliteAssignmentStore ─────────────────────────────────────────────────

describe('SqliteAssignmentStore', () => {
  let store: SqliteAssignmentStore;

  beforeEach(() => {
    store = new SqliteAssignmentStore(makeDb());
  });

  const makeAssignment = (overrides: Partial<Assignment> = {}): Assignment => ({
    id: 'assign_job_1',
    jobId: 'job_1',
    agentName: 'WebsiteBuilderAgent',
    reason: 'Capability match for build_site_page',
    createdAt: 1000,
    ...overrides,
  });

  it('creates and retrieves an assignment', () => {
    store.create(makeAssignment());
    const retrieved = store.getById('assign_job_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.agentName).toBe('WebsiteBuilderAgent');
  });

  it('returns existing assignment on duplicate create', () => {
    store.create(makeAssignment());
    const dup = store.create({ ...makeAssignment(), agentName: 'OtherAgent' });
    expect(dup.agentName).toBe('WebsiteBuilderAgent');
  });

  it('lists all assignments', () => {
    store.create(makeAssignment({ id: 'a1' }));
    store.create(makeAssignment({ id: 'a2' }));
    expect(store.listAll()).toHaveLength(2);
  });

  it('lists by job ID', () => {
    store.create(makeAssignment({ id: 'a1', jobId: 'j1' }));
    store.create(makeAssignment({ id: 'a2', jobId: 'j2' }));
    expect(store.listByJobId('j1')).toHaveLength(1);
  });

  it('lists by agent name', () => {
    store.create(makeAssignment({ id: 'a1', agentName: 'AgentA' }));
    store.create(makeAssignment({ id: 'a2', agentName: 'AgentB' }));
    store.create(makeAssignment({ id: 'a3', agentName: 'AgentA' }));
    expect(store.listByAgentName('AgentA')).toHaveLength(2);
  });

  it('revokes an assignment', () => {
    store.create(makeAssignment());
    const revoked = store.revoke('assign_job_1', 2000, 'agent unavailable');
    expect(revoked).toBeDefined();
    expect(revoked!.revokedAt).toBe(2000);
    expect(revoked!.revokedReason).toBe('agent unavailable');

    const retrieved = store.getById('assign_job_1');
    expect(retrieved!.revokedAt).toBe(2000);
  });

  it('revoke returns undefined for unknown ID', () => {
    expect(store.revoke('nonexistent', 2000, 'reason')).toBeUndefined();
  });

  it('handles optional fields (fallback, revocation)', () => {
    store.create(makeAssignment({
      fallbackAgentName: 'FallbackAgent',
      fallbackReason: 'Primary unavailable',
    }));
    const retrieved = store.getById('assign_job_1');
    expect(retrieved!.fallbackAgentName).toBe('FallbackAgent');
    expect(retrieved!.fallbackReason).toBe('Primary unavailable');
  });

  it('resets clears all assignments', () => {
    store.create(makeAssignment());
    store.reset();
    expect(store.listAll()).toHaveLength(0);
  });
});
