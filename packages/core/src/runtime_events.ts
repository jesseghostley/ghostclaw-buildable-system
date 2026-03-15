import type { Signal, Plan, Job, Artifact } from './runtime_loop';
import type { SkillInvocation } from './skill_invocation';
import type { PublishEvent } from './publish_event';
import type { AuditLogEntry } from './audit_log';

/**
 * RuntimeEventMap — strongly-typed mapping of every runtime lifecycle event
 * to its canonical payload type.
 *
 * This map is the single source of truth for the event-driven orchestration
 * layer.  The typed EventBus uses this map to enforce payload types on
 * emit() and on() at compile time.
 */
export interface RuntimeEventMap {
  /** Signal created and received by the runtime. */
  'signal.received': Signal;
  /** Plan derived from a received signal. */
  'plan.created': Plan;
  /** Job enqueued for execution. */
  'job.queued': Job;
  /** Agent assigned to a job. */
  'job.assigned': Job & { agentName: string };
  /** Skill invocation transitions from pending → running. */
  'skill.invocation.started': SkillInvocation;
  /** Skill invocation completes successfully. */
  'skill.invocation.completed': SkillInvocation;
  /** Skill invocation fails. */
  'skill.invocation.failed': SkillInvocation;
  /** Artifact produced from a completed skill invocation. */
  'artifact.created': Artifact;
  /** Publish flow initiated for an artifact. */
  'publish.requested': PublishEvent;
  /** Publish completes successfully. */
  'publish.completed': PublishEvent;
  /** Audit entry appended to the audit log. */
  'audit.logged': AuditLogEntry;
}
