import type { StorageConfig } from './storage_config';
import type {
  ISignalStore,
  IPlanStore,
  IJobStore,
  IAssignmentStore,
  ISkillInvocationStore,
  IArtifactStore,
  IPublishEventStore,
  IAuditLogStore,
  IWorkspacePolicyStore,
  IRuntimeEventLogStore,
  IBlueprintStore,
  IWorkspaceStore,
} from './interfaces';

import Database from 'better-sqlite3';
import { InMemorySignalStore } from './memory/InMemorySignalStore';
import { InMemoryPlanStore } from './memory/InMemoryPlanStore';
import { InMemoryArtifactStore } from './memory/InMemoryArtifactStore';
import { InMemoryJobQueue } from '../job_queue';
import { InMemoryAssignmentStore } from '../assignment';
import { InMemorySkillInvocationStore } from '../skill_invocation';
import { InMemoryPublishEventStore } from '../publish_event';
import { InMemoryAuditLog } from '../audit_log';
import { InMemoryWorkspacePolicyStore } from '../workspace_policy';
import { InMemoryRuntimeEventLogStore } from '../runtime_event_log';

import { SqliteJobStore } from './sqlite/SqliteJobStore';
import { SqliteSkillInvocationStore } from './sqlite/SqliteSkillInvocationStore';
import { SqliteArtifactStore } from './sqlite/SqliteArtifactStore';
import { SqliteAuditLogStore } from './sqlite/SqliteAuditLogStore';
import { SqliteSignalStore } from './sqlite/SqliteSignalStore';
import { SqlitePlanStore } from './sqlite/SqlitePlanStore';
import { SqliteAssignmentStore } from './sqlite/SqliteAssignmentStore';
import { SqlitePublishEventStore } from './sqlite/SqlitePublishEventStore';
import { SqliteWorkspacePolicyStore } from './sqlite/SqliteWorkspacePolicyStore';
import { SqliteRuntimeEventLogStore } from './sqlite/SqliteRuntimeEventLogStore';
import { SqliteBlueprintStore } from './sqlite/SqliteBlueprintStore';
import { SqliteWorkspaceStore } from './sqlite/SqliteWorkspaceStore';

// In-memory implementations for blueprint and workspace (used in memory mode)
import { blueprintRegistry as inMemoryBlueprintRegistry } from '../../../../packages/blueprints/src/registry';
import { workspaceStore as inMemoryWorkspaceStore } from '../../../../packages/workspaces/src/store';

export type StoreBundle = {
  signalStore: ISignalStore;
  planStore: IPlanStore;
  jobStore: IJobStore;
  assignmentStore: IAssignmentStore;
  skillInvocationStore: ISkillInvocationStore;
  artifactStore: IArtifactStore;
  publishEventStore: IPublishEventStore;
  auditLogStore: IAuditLogStore;
  workspacePolicyStore: IWorkspacePolicyStore;
  runtimeEventLogStore: IRuntimeEventLogStore;
  blueprintStore: IBlueprintStore;
  workspaceStore: IWorkspaceStore;
  /** Raw database handle — only present in sqlite mode. */
  db: Database.Database | null;
};

export function createStores(config: StorageConfig): StoreBundle {
  if (config.mode === 'sqlite') {
    if (!config.sqlitePath) {
      throw new Error('sqlitePath is required when storage mode is sqlite');
    }

    const db = new Database(config.sqlitePath);

    return {
      signalStore: new SqliteSignalStore(db),
      planStore: new SqlitePlanStore(db),
      jobStore: new SqliteJobStore(db),
      assignmentStore: new SqliteAssignmentStore(db),
      skillInvocationStore: new SqliteSkillInvocationStore(db),
      artifactStore: new SqliteArtifactStore(db),
      publishEventStore: new SqlitePublishEventStore(db),
      auditLogStore: new SqliteAuditLogStore(db),
      workspacePolicyStore: new SqliteWorkspacePolicyStore(db),
      runtimeEventLogStore: new SqliteRuntimeEventLogStore(db),
      blueprintStore: new SqliteBlueprintStore(db),
      workspaceStore: new SqliteWorkspaceStore(db),
      db,
    };
  }

  // Default: in-memory mode
  return {
    signalStore: new InMemorySignalStore(),
    planStore: new InMemoryPlanStore(),
    jobStore: new InMemoryJobQueue(),
    assignmentStore: new InMemoryAssignmentStore(),
    skillInvocationStore: new InMemorySkillInvocationStore(),
    artifactStore: new InMemoryArtifactStore(),
    publishEventStore: new InMemoryPublishEventStore(),
    auditLogStore: new InMemoryAuditLog(),
    workspacePolicyStore: new InMemoryWorkspacePolicyStore(),
    runtimeEventLogStore: new InMemoryRuntimeEventLogStore(),
    blueprintStore: inMemoryBlueprintRegistry,
    workspaceStore: inMemoryWorkspaceStore,
    db: null,
  };
}
