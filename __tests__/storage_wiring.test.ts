import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { initializeStores, getStores } from '../packages/core/src/store_provider';
import { runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { publishEventStore } from '../packages/core/src/publish_event';
import { auditLog } from '../packages/core/src/audit_log';
import { blueprintRegistry } from '../packages/blueprints/src/registry';
import { workspaceStore } from '../packages/workspaces/src/store';

function tmpDbPath(): string {
  return path.join(
    os.tmpdir(),
    `ghostclaw-wiring-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
  );
}

function clearRuntimeStore(): void {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
}

describe('Storage mode wiring', () => {
  beforeEach(() => {
    clearRuntimeStore();
  });

  it('replaces all singletons in sqlite mode — including blueprints and workspaces', () => {
    const dbPath = tmpDbPath();

    const stores = initializeStores({ mode: 'sqlite', sqlitePath: dbPath });

    // Core singletons should point to the factory-created stores
    expect(jobQueue).toBe(stores.jobStore);
    expect(skillInvocationStore).toBe(stores.skillInvocationStore);
    expect(assignmentStore).toBe(stores.assignmentStore);
    expect(publishEventStore).toBe(stores.publishEventStore);
    expect(auditLog).toBe(stores.auditLogStore);

    // Blueprint and workspace singletons should also be replaced
    expect(blueprintRegistry).toBe(stores.blueprintStore);
    expect(workspaceStore).toBe(stores.workspaceStore);

    // getStores() should return the same bundle
    expect(getStores()).toBe(stores);

    // db handle should be present
    expect(stores.db).not.toBeNull();

    fs.unlinkSync(dbPath);
  });

  it('replaces all singletons in memory mode', () => {
    const stores = initializeStores({ mode: 'memory' });

    expect(jobQueue).toBe(stores.jobStore);
    expect(skillInvocationStore).toBe(stores.skillInvocationStore);
    expect(assignmentStore).toBe(stores.assignmentStore);
    expect(publishEventStore).toBe(stores.publishEventStore);
    expect(auditLog).toBe(stores.auditLogStore);
    expect(blueprintRegistry).toBe(stores.blueprintStore);
    expect(workspaceStore).toBe(stores.workspaceStore);

    // db handle should be null in memory mode
    expect(stores.db).toBeNull();
  });

  it('persists blueprint data across restarts in sqlite mode', () => {
    const dbPath = tmpDbPath();

    // First init — create a blueprint
    const stores1 = initializeStores({ mode: 'sqlite', sqlitePath: dbPath });
    stores1.blueprintStore.create({
      id: 'bp_test_persist',
      name: 'Test Blueprint',
      description: 'Persistence test',
      version: '1.0.0',
      triggerSignal: 'test_signal',
      plannerAction: 'generate_content_cluster',
      strategyId: 'rule_keyword_cluster',
      status: 'active',
      steps: [],
      inputs: [],
      outputs: [],
      approvalGates: [],
      requiredAgents: [],
      requiredSkills: [],
      queueType: 'sequential',
      auditEvents: [],
      memoryKeys: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Second init — simulate restart
    clearRuntimeStore();
    const stores2 = initializeStores({ mode: 'sqlite', sqlitePath: dbPath });

    // Blueprint should persist
    const bp = stores2.blueprintStore.getById('bp_test_persist');
    expect(bp).toBeDefined();
    expect(bp!.name).toBe('Test Blueprint');

    // The module-level singleton should also see it
    expect(blueprintRegistry.getById('bp_test_persist')).toBeDefined();

    fs.unlinkSync(dbPath);
  });

  it('persists workspace data across restarts in sqlite mode', () => {
    const dbPath = tmpDbPath();

    // First init — create a workspace
    const stores1 = initializeStores({ mode: 'sqlite', sqlitePath: dbPath });
    stores1.workspaceStore.create({
      id: 'ws_test_persist',
      name: 'Test Workspace',
      description: 'Persistence test',
      status: 'active',
      blueprintIds: [],
      agentIds: [],
      policyIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Second init — simulate restart
    clearRuntimeStore();
    const stores2 = initializeStores({ mode: 'sqlite', sqlitePath: dbPath });

    // Workspace should persist
    const ws = stores2.workspaceStore.getById('ws_test_persist');
    expect(ws).toBeDefined();
    expect(ws!.name).toBe('Test Workspace');

    // The module-level singleton should also see it
    expect(workspaceStore.getById('ws_test_persist')).toBeDefined();

    fs.unlinkSync(dbPath);
  });

  it('throws when sqlite mode is set without sqlitePath', () => {
    expect(() => {
      initializeStores({ mode: 'sqlite' });
    }).toThrow(/GHOSTCLAW_SQLITE_PATH/);
  });
});
