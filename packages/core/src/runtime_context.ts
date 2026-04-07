import type { EventBus } from './event_bus';
import type { RuntimeEventMap } from './runtime_events';
import type { StoreBundle } from './storage/storage_factory';
import type { StorageConfig } from './storage/storage_config';
import { createStores } from './storage/storage_factory';
import { eventBus as defaultEventBus } from './event_bus';
import { jobQueue as defaultJobQueue } from './job_queue';
import { skillInvocationStore as defaultSkillInvocationStore } from './skill_invocation';
import { assignmentStore as defaultAssignmentStore } from './assignment';
import { auditLog as defaultAuditLog } from './audit_log';
import { publishEventStore as defaultPublishEventStore } from './publish_event';
import { workspacePolicyStore as defaultWorkspacePolicyStore } from './workspace_policy';
import { runtimeEventLog as defaultRuntimeEventLog } from './runtime_event_log';
import { InMemorySignalStore } from './storage/memory/InMemorySignalStore';
import { InMemoryPlanStore } from './storage/memory/InMemoryPlanStore';
import { InMemoryArtifactStore } from './storage/memory/InMemoryArtifactStore';

/**
 * RuntimeContext bundles all stores and the event bus into a single
 * injectable dependency.  This enables both in-memory (development/test)
 * and SQLite (production) modes from a single configuration point.
 */
export type RuntimeContext = {
  stores: StoreBundle;
  eventBus: EventBus<RuntimeEventMap>;
};

/**
 * The default runtime context uses the existing in-memory singletons.
 * This preserves full backward compatibility: code that doesn't pass
 * a context gets the same singletons it always used.
 */
export const defaultRuntimeContext: RuntimeContext = {
  stores: {
    signalStore: new InMemorySignalStore(),
    planStore: new InMemoryPlanStore(),
    jobStore: defaultJobQueue,
    assignmentStore: defaultAssignmentStore,
    skillInvocationStore: defaultSkillInvocationStore,
    artifactStore: new InMemoryArtifactStore(),
    publishEventStore: defaultPublishEventStore,
    auditLogStore: defaultAuditLog,
    workspacePolicyStore: defaultWorkspacePolicyStore,
    runtimeEventLogStore: defaultRuntimeEventLog,
  },
  eventBus: defaultEventBus,
};

/**
 * Create a new RuntimeContext from a storage configuration.
 * For 'sqlite' mode, all supported stores use SQLite; for 'memory'
 * mode, all stores use in-memory implementations.
 */
export function createRuntimeContext(config: StorageConfig): RuntimeContext {
  return {
    stores: createStores(config),
    eventBus: defaultEventBus,
  };
}
