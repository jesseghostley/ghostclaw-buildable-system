import Database from 'better-sqlite3';
import * as os from 'os';
import * as path from 'path';
import { SqliteSignalStore } from '../../packages/core/src/storage/sqlite/SqliteSignalStore';
import { SqlitePlanStore } from '../../packages/core/src/storage/sqlite/SqlitePlanStore';
import { SqlitePublishEventStore } from '../../packages/core/src/storage/sqlite/SqlitePublishEventStore';
import { SqliteBlueprintStore } from '../../packages/core/src/storage/sqlite/SqliteBlueprintStore';
import { SqliteWorkspaceStore } from '../../packages/core/src/storage/sqlite/SqliteWorkspaceStore';
import type { Signal, Plan } from '../../packages/core/src/runtime_loop';
import type { PublishEvent } from '../../packages/core/src/publish_event';
import type { Blueprint } from '../../packages/blueprints/src/types';
import type { Workspace } from '../../packages/workspaces/src/types';

let db: InstanceType<typeof Database>;

beforeEach(() => {
  const dbPath = path.join(os.tmpdir(), `ghostclaw-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  db = new Database(dbPath);
});

afterEach(() => {
  db.close();
});

// ── SqliteSignalStore ───────────────────────────────────────────────────────

describe('SqliteSignalStore', () => {
  let store: SqliteSignalStore;
  beforeEach(() => { store = new SqliteSignalStore(db); });

  const makeSignal = (id: string): Signal => ({
    id,
    name: 'test_signal',
    payload: { key: 'value' },
    createdAt: Date.now(),
  });

  it('creates and retrieves a signal', () => {
    const signal = makeSignal('sig_1');
    store.create(signal);
    const retrieved = store.getById('sig_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('test_signal');
    expect(retrieved!.payload).toEqual({ key: 'value' });
  });

  it('lists all signals', () => {
    store.create(makeSignal('sig_1'));
    store.create(makeSignal('sig_2'));
    expect(store.listAll()).toHaveLength(2);
  });

  it('handles signal with no payload', () => {
    const signal: Signal = { id: 'sig_no_payload', name: 'empty', createdAt: Date.now() };
    store.create(signal);
    const retrieved = store.getById('sig_no_payload');
    expect(retrieved!.payload).toBeUndefined();
  });

  it('resets clears all signals', () => {
    store.create(makeSignal('sig_1'));
    store.reset();
    expect(store.listAll()).toHaveLength(0);
  });
});

// ── SqlitePlanStore ─────────────────────────────────────────────────────────

describe('SqlitePlanStore', () => {
  let store: SqlitePlanStore;
  beforeEach(() => { store = new SqlitePlanStore(db); });

  const makePlan = (id: string, signalId: string): Plan => ({
    id,
    signalId,
    action: 'build_contractor_website',
    strategyId: 'rule_contractor_website_strategy',
    strategyType: 'rule',
    priority: 5,
    requiredAgents: ['SiteArchitectAgent'],
    expectedOutputs: ['design_site_structure'],
    createdAt: Date.now(),
  });

  it('creates and retrieves a plan', () => {
    store.create(makePlan('plan_1', 'sig_1'));
    const retrieved = store.getById('plan_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.action).toBe('build_contractor_website');
    expect(retrieved!.requiredAgents).toEqual(['SiteArchitectAgent']);
  });

  it('lists by signal ID', () => {
    store.create(makePlan('plan_1', 'sig_1'));
    store.create(makePlan('plan_2', 'sig_1'));
    store.create(makePlan('plan_3', 'sig_2'));
    expect(store.listBySignalId('sig_1')).toHaveLength(2);
  });

  it('handles plan without optional fields', () => {
    const plan: Plan = {
      id: 'plan_minimal',
      signalId: 'sig_1',
      action: 'build_contractor_website',
      strategyId: 'test',
      strategyType: 'rule',
      createdAt: Date.now(),
    };
    store.create(plan);
    const retrieved = store.getById('plan_minimal');
    expect(retrieved!.priority).toBeUndefined();
    expect(retrieved!.requiredAgents).toBeUndefined();
  });
});

// ── SqlitePublishEventStore ─────────────────────────────────────────────────

describe('SqlitePublishEventStore', () => {
  let store: SqlitePublishEventStore;
  beforeEach(() => { store = new SqlitePublishEventStore(db); });

  const makeEvent = (id: string, status: PublishEvent['status'] = 'pending'): PublishEvent => ({
    id,
    artifactId: `artifact_${id}`,
    publishedAt: Date.now(),
    destination: 'website_cms',
    status,
    publishedBy: 'QAReviewAgent',
  });

  it('creates and retrieves a publish event', () => {
    store.create(makeEvent('pub_1'));
    const retrieved = store.getById('pub_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.destination).toBe('website_cms');
    expect(retrieved!.status).toBe('pending');
  });

  it('lists by status', () => {
    store.create(makeEvent('pub_1', 'pending'));
    store.create(makeEvent('pub_2', 'approved'));
    store.create(makeEvent('pub_3', 'pending'));
    expect(store.listByStatus('pending')).toHaveLength(2);
    expect(store.listByStatus('approved')).toHaveLength(1);
  });

  it('updates status with approval fields', () => {
    store.create(makeEvent('pub_1'));
    store.updateStatus('pub_1', 'approved', {
      approvedBy: 'operator:jesse',
      approvedAt: Date.now(),
    });
    const updated = store.getById('pub_1');
    expect(updated!.status).toBe('approved');
    expect(updated!.approvedBy).toBe('operator:jesse');
  });

  it('updates status with publish fields', () => {
    store.create(makeEvent('pub_1'));
    store.updateStatus('pub_1', 'approved', { approvedBy: 'op' });
    store.updateStatus('pub_1', 'published', { externalUrl: 'https://example.com' });
    const updated = store.getById('pub_1');
    expect(updated!.status).toBe('published');
    expect(updated!.externalUrl).toBe('https://example.com');
  });

  it('updates status with rejection', () => {
    store.create(makeEvent('pub_1'));
    store.updateStatus('pub_1', 'rejected', { failureReason: 'Bad content' });
    const updated = store.getById('pub_1');
    expect(updated!.status).toBe('rejected');
    expect(updated!.failureReason).toBe('Bad content');
  });

  it('lists by artifact ID', () => {
    store.create(makeEvent('pub_1'));
    store.create(makeEvent('pub_2'));
    expect(store.listByArtifactId('artifact_pub_1')).toHaveLength(1);
  });
});

// ── SqliteBlueprintStore ────────────────────────────────────────────────────

describe('SqliteBlueprintStore', () => {
  let store: SqliteBlueprintStore;
  beforeEach(() => { store = new SqliteBlueprintStore(db); });

  const makeBlueprint = (id: string, status: Blueprint['status'] = 'active'): Blueprint => ({
    id,
    name: 'Test Blueprint',
    version: '1.0.0',
    description: 'A test blueprint',
    status,
    triggerSignal: 'test_signal',
    plannerAction: 'build_contractor_website',
    strategyId: 'rule_test',
    steps: [
      { order: 1, jobType: 'design_site_structure', agentId: 'SiteArchitectAgent', skillId: 'design_site_structure', description: 'Design', passOutputForward: true },
    ],
    inputs: [{ name: 'businessName', type: 'string', required: true, description: 'Name' }],
    outputs: [{ name: 'site_structure', artifactType: 'design_site_structure', description: 'Structure' }],
    approvalGates: [{ afterStep: 1, type: 'operator', description: 'Approve' }],
    requiredAgents: ['SiteArchitectAgent'],
    requiredSkills: ['design_site_structure'],
    queueType: 'sequential',
    auditEvents: ['job.completed'],
    memoryKeys: ['site_structure'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  it('creates and retrieves a blueprint', () => {
    store.create(makeBlueprint('bp_1'));
    const retrieved = store.getById('bp_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Blueprint');
    expect(retrieved!.steps).toHaveLength(1);
    expect(retrieved!.steps[0].jobType).toBe('design_site_structure');
  });

  it('finds blueprint by signal', () => {
    store.create(makeBlueprint('bp_1'));
    const found = store.getBySignal('test_signal');
    expect(found).toBeDefined();
    expect(found!.id).toBe('bp_1');
  });

  it('only finds active blueprints by signal', () => {
    store.create(makeBlueprint('bp_1', 'archived'));
    const found = store.getBySignal('test_signal');
    expect(found).toBeUndefined();
  });

  it('lists active blueprints', () => {
    store.create(makeBlueprint('bp_1', 'active'));
    store.create(makeBlueprint('bp_2', 'archived'));
    expect(store.listActive()).toHaveLength(1);
    expect(store.listAll()).toHaveLength(2);
  });

  it('deactivates a blueprint', () => {
    store.create(makeBlueprint('bp_1'));
    const deactivated = store.deactivate('bp_1');
    expect(deactivated!.status).toBe('archived');
    expect(store.listActive()).toHaveLength(0);
  });

  it('preserves all JSON fields through round-trip', () => {
    const bp = makeBlueprint('bp_roundtrip');
    store.create(bp);
    const retrieved = store.getById('bp_roundtrip')!;
    expect(retrieved.approvalGates).toEqual(bp.approvalGates);
    expect(retrieved.requiredAgents).toEqual(bp.requiredAgents);
    expect(retrieved.requiredSkills).toEqual(bp.requiredSkills);
    expect(retrieved.auditEvents).toEqual(bp.auditEvents);
    expect(retrieved.memoryKeys).toEqual(bp.memoryKeys);
    expect(retrieved.inputs).toEqual(bp.inputs);
    expect(retrieved.outputs).toEqual(bp.outputs);
  });
});

// ── SqliteWorkspaceStore ────────────────────────────────────────────────────

describe('SqliteWorkspaceStore', () => {
  let store: SqliteWorkspaceStore;
  beforeEach(() => { store = new SqliteWorkspaceStore(db); });

  const makeWorkspace = (id: string): Workspace => ({
    id,
    name: 'Test Workspace',
    description: 'For testing',
    status: 'active',
    blueprintIds: ['bp_1', 'bp_2'],
    agentIds: ['SiteArchitectAgent'],
    policyIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  it('creates and retrieves a workspace', () => {
    store.create(makeWorkspace('ws_1'));
    const retrieved = store.getById('ws_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Workspace');
    expect(retrieved!.blueprintIds).toEqual(['bp_1', 'bp_2']);
  });

  it('lists active workspaces', () => {
    store.create(makeWorkspace('ws_1'));
    const ws2: Workspace = { ...makeWorkspace('ws_2'), status: 'archived' };
    store.create(ws2);
    expect(store.listActive()).toHaveLength(1);
    expect(store.listAll()).toHaveLength(2);
  });

  it('updates workspace fields', () => {
    store.create(makeWorkspace('ws_1'));
    store.update('ws_1', { name: 'Updated Name', blueprintIds: ['bp_3'] });
    const updated = store.getById('ws_1');
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.blueprintIds).toEqual(['bp_3']);
  });

  it('preserves JSON arrays through round-trip', () => {
    const ws = makeWorkspace('ws_roundtrip');
    store.create(ws);
    const retrieved = store.getById('ws_roundtrip')!;
    expect(retrieved.blueprintIds).toEqual(ws.blueprintIds);
    expect(retrieved.agentIds).toEqual(ws.agentIds);
    expect(retrieved.policyIds).toEqual(ws.policyIds);
  });
});

// ── Storage Factory V2 Integration ──────────────────────────────────────────

describe('Storage Factory — V2 sqlite mode includes all new stores', () => {
  it('creates all 12 stores in sqlite mode', () => {
    const dbPath = path.join(os.tmpdir(), `ghostclaw-factory-v2-${Date.now()}.sqlite`);
    const { createStores } = require('../../packages/core/src/storage/storage_factory');
    const stores = createStores({ mode: 'sqlite', sqlitePath: dbPath });

    expect(stores.signalStore).toBeInstanceOf(SqliteSignalStore);
    expect(stores.planStore).toBeInstanceOf(SqlitePlanStore);
    expect(stores.publishEventStore).toBeInstanceOf(SqlitePublishEventStore);
    expect(stores.blueprintStore).toBeInstanceOf(SqliteBlueprintStore);
    expect(stores.workspaceStore).toBeInstanceOf(SqliteWorkspaceStore);
  });

  it('creates all 12 stores in memory mode', () => {
    const { createStores } = require('../../packages/core/src/storage/storage_factory');
    const stores = createStores({ mode: 'memory' });

    expect(stores.blueprintStore).toBeDefined();
    expect(stores.workspaceStore).toBeDefined();
    expect(stores.signalStore).toBeDefined();
    expect(stores.publishEventStore).toBeDefined();
  });
});
