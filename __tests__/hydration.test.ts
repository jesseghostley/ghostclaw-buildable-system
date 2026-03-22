import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { createStores } from '../packages/core/src/storage/storage_factory';
import { runtimeStore, hydrateRuntimeStore } from '../packages/core/src/runtime_loop';
import { initializeStores } from '../packages/core/src/store_provider';
import { uniqueId } from '../packages/core/src/unique_id';

function tmpDbPath(): string {
  return path.join(os.tmpdir(), `ghostclaw-hydration-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
}

/** Clear runtimeStore arrays between tests. */
function clearRuntimeStore(): void {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
}

describe('hydrateRuntimeStore', () => {
  beforeEach(() => {
    clearRuntimeStore();
  });

  it('populates runtimeStore arrays from SQLite stores', () => {
    const dbPath = tmpDbPath();
    const stores = createStores({ mode: 'sqlite', sqlitePath: dbPath });

    // Write data directly to SQLite stores
    const signal = { id: uniqueId('signal'), name: 'test_signal', payload: { foo: 1 }, createdAt: Date.now() };
    stores.signalStore.create(signal);

    const plan = {
      id: uniqueId('plan'),
      signalId: signal.id,
      action: 'generate_content_cluster' as const,
      strategyId: 'rule_keyword_cluster',
      strategyType: 'rule' as const,
      createdAt: Date.now(),
    };
    stores.planStore.create(plan);

    const artifact = {
      id: uniqueId('artifact'),
      jobId: 'job_1',
      skillInvocationId: 'inv_1',
      type: 'test_type',
      content: '{"result":"hello"}',
      createdAt: Date.now(),
    };
    stores.artifactStore.create(artifact);

    // Verify runtimeStore is still empty before hydration
    expect(runtimeStore.signals).toHaveLength(0);
    expect(runtimeStore.plans).toHaveLength(0);
    expect(runtimeStore.artifacts).toHaveLength(0);

    // Hydrate
    hydrateRuntimeStore(stores);

    // Verify data was loaded
    expect(runtimeStore.signals).toHaveLength(1);
    expect(runtimeStore.signals[0].id).toBe(signal.id);
    expect(runtimeStore.plans).toHaveLength(1);
    expect(runtimeStore.plans[0].id).toBe(plan.id);
    expect(runtimeStore.artifacts).toHaveLength(1);
    expect(runtimeStore.artifacts[0].id).toBe(artifact.id);

    // Cleanup
    fs.unlinkSync(dbPath);
  });

  it('hydrates empty arrays from a fresh SQLite database', () => {
    const dbPath = tmpDbPath();
    const stores = createStores({ mode: 'sqlite', sqlitePath: dbPath });

    hydrateRuntimeStore(stores);

    expect(runtimeStore.signals).toHaveLength(0);
    expect(runtimeStore.plans).toHaveLength(0);
    expect(runtimeStore.jobs).toHaveLength(0);
    expect(runtimeStore.artifacts).toHaveLength(0);
    expect(runtimeStore.skillInvocations).toHaveLength(0);
    expect(runtimeStore.assignments).toHaveLength(0);

    fs.unlinkSync(dbPath);
  });

  it('is idempotent — calling twice does not duplicate entries', () => {
    const dbPath = tmpDbPath();
    const stores = createStores({ mode: 'sqlite', sqlitePath: dbPath });

    stores.signalStore.create({
      id: uniqueId('signal'),
      name: 'test',
      createdAt: Date.now(),
    });

    hydrateRuntimeStore(stores);
    expect(runtimeStore.signals).toHaveLength(1);

    hydrateRuntimeStore(stores);
    expect(runtimeStore.signals).toHaveLength(1);

    fs.unlinkSync(dbPath);
  });

  it('clears pre-existing runtimeStore data before loading', () => {
    const dbPath = tmpDbPath();
    const stores = createStores({ mode: 'sqlite', sqlitePath: dbPath });

    // Manually push stale data into runtimeStore
    runtimeStore.signals.push({
      id: 'stale_signal',
      name: 'stale',
      createdAt: 0,
    });
    expect(runtimeStore.signals).toHaveLength(1);

    // Hydrate from empty DB — stale data should be cleared
    hydrateRuntimeStore(stores);
    expect(runtimeStore.signals).toHaveLength(0);

    fs.unlinkSync(dbPath);
  });
});

describe('initializeStores — sqlite hydration integration', () => {
  beforeEach(() => {
    clearRuntimeStore();
  });

  it('hydrates runtimeStore when mode is sqlite', () => {
    const dbPath = tmpDbPath();

    // First init: create stores and write a signal
    const stores1 = createStores({ mode: 'sqlite', sqlitePath: dbPath });
    stores1.signalStore.create({
      id: 'signal_persist_test',
      name: 'persist_test',
      payload: { batch: true },
      createdAt: Date.now(),
    });
    stores1.artifactStore.create({
      id: 'artifact_persist_test',
      jobId: 'job_x',
      skillInvocationId: 'inv_x',
      type: 'generate_page_content',
      content: '{"result":"page content"}',
      createdAt: Date.now(),
    });

    // Simulate restart: clear runtimeStore, call initializeStores
    clearRuntimeStore();
    expect(runtimeStore.signals).toHaveLength(0);
    expect(runtimeStore.artifacts).toHaveLength(0);

    initializeStores({ mode: 'sqlite', sqlitePath: dbPath });

    // runtimeStore should now contain the persisted data
    expect(runtimeStore.signals).toHaveLength(1);
    expect(runtimeStore.signals[0].id).toBe('signal_persist_test');
    expect(runtimeStore.artifacts).toHaveLength(1);
    expect(runtimeStore.artifacts[0].id).toBe('artifact_persist_test');

    fs.unlinkSync(dbPath);
  });

  it('does NOT hydrate in memory mode', () => {
    // Push stale data — memory mode should NOT clear it via hydration
    // (memory mode just starts fresh stores; runtimeStore arrays remain
    // as-is because no hydration runs).
    initializeStores({ mode: 'memory' });
    // runtimeStore should remain empty (fresh arrays from module load)
    expect(runtimeStore.signals).toHaveLength(0);
  });
});
