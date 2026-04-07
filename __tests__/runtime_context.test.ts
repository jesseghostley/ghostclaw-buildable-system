import * as os from 'os';
import * as path from 'path';
import { createRuntimeContext, defaultRuntimeContext } from '../packages/core/src/runtime_context';
import { processSignal, runtimeStore, resetIdCounters } from '../packages/core/src/runtime_loop';
import { registerRuntimeSubscribers, resetSubscriberState } from '../packages/core/src/runtime_subscribers';

beforeEach(() => {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  resetIdCounters();
});

describe('RuntimeContext', () => {
  it('defaultRuntimeContext has all store properties', () => {
    const ctx = defaultRuntimeContext;
    expect(ctx.stores.signalStore).toBeDefined();
    expect(ctx.stores.planStore).toBeDefined();
    expect(ctx.stores.jobStore).toBeDefined();
    expect(ctx.stores.assignmentStore).toBeDefined();
    expect(ctx.stores.skillInvocationStore).toBeDefined();
    expect(ctx.stores.artifactStore).toBeDefined();
    expect(ctx.stores.publishEventStore).toBeDefined();
    expect(ctx.stores.auditLogStore).toBeDefined();
    expect(ctx.stores.workspacePolicyStore).toBeDefined();
    expect(ctx.stores.runtimeEventLogStore).toBeDefined();
    expect(ctx.eventBus).toBeDefined();
  });

  it('createRuntimeContext with memory mode returns working stores', () => {
    const ctx = createRuntimeContext({ mode: 'memory' });
    expect(ctx.stores.signalStore).toBeDefined();
    expect(ctx.stores.jobStore).toBeDefined();
    expect(ctx.eventBus).toBeDefined();
  });

  it('createRuntimeContext with sqlite mode returns working stores', () => {
    const dbPath = path.join(os.tmpdir(), `ghostclaw-ctx-test-${Date.now()}.sqlite`);
    const ctx = createRuntimeContext({ mode: 'sqlite', sqlitePath: dbPath });
    expect(ctx.stores.signalStore).toBeDefined();
    expect(ctx.stores.jobStore).toBeDefined();
  });
});

describe('processSignal with RuntimeContext', () => {
  it('persists signal and plan to context stores (memory mode)', () => {
    const ctx = createRuntimeContext({ mode: 'memory' });
    registerRuntimeSubscribers(ctx.eventBus, ctx.stores.auditLogStore, ctx.stores.publishEventStore, ctx.stores.runtimeEventLogStore);

    const result = processSignal(
      { name: 'contractor_site_requested', payload: { sites: [{ businessName: 'Test Co', trade: 'test', location: 'Test, TX' }] } },
      ctx,
    );

    // Verify stores were populated
    expect(ctx.stores.signalStore.listAll()).toHaveLength(1);
    expect(ctx.stores.planStore.listAll()).toHaveLength(1);
    expect(ctx.stores.artifactStore.listAll()).toHaveLength(1);

    // Verify result still works
    expect(result.artifacts).toHaveLength(1);
    const content = JSON.parse(result.artifacts[0].content);
    expect(content.handoffReady).toBe(true);
  });

  it('persists to SQLite context stores', () => {
    const dbPath = path.join(os.tmpdir(), `ghostclaw-ctx-test-${Date.now()}.sqlite`);
    const ctx = createRuntimeContext({ mode: 'sqlite', sqlitePath: dbPath });
    registerRuntimeSubscribers(ctx.eventBus, ctx.stores.auditLogStore, ctx.stores.publishEventStore, ctx.stores.runtimeEventLogStore);

    processSignal(
      { name: 'contractor_site_requested', payload: { sites: [{ businessName: 'SQLite Co', trade: 'plumbing', location: 'Denver, CO' }] } },
      ctx,
    );

    expect(ctx.stores.signalStore.listAll()).toHaveLength(1);
    expect(ctx.stores.planStore.listAll()).toHaveLength(1);
    expect(ctx.stores.jobStore.list()).toHaveLength(1);
    expect(ctx.stores.artifactStore.listAll()).toHaveLength(1);

    // Verify data survives new context with same DB path
    const ctx2 = createRuntimeContext({ mode: 'sqlite', sqlitePath: dbPath });
    expect(ctx2.stores.signalStore.listAll()).toHaveLength(1);
    expect(ctx2.stores.signalStore.listAll()[0].name).toBe('contractor_site_requested');
    expect(ctx2.stores.planStore.listAll()).toHaveLength(1);
    expect(ctx2.stores.artifactStore.listAll()).toHaveLength(1);
  });

  it('processSignal without context still uses singletons', () => {
    const result = processSignal({
      name: 'keyword_opportunity_detected',
      payload: { topic: 'test' },
    });

    expect(result.signal.name).toBe('keyword_opportunity_detected');
    expect(result.jobs[0].status).toBe('completed');
    expect(runtimeStore.signals).toHaveLength(1);
  });
});
