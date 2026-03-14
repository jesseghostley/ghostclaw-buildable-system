export type RuntimeEventType =
  | 'signal_received'
  | 'plan_created'
  | 'workflow_created'
  | 'job_queued'
  | 'job_started'
  | 'job_completed'
  | 'job_failed'
  | 'job_blocked'
  | 'job_unblocked'
  | 'artifact_created'
  | 'review_submitted'
  | 'job_approved'
  | 'job_rejected'
  | 'job_published'
  | 'runtime_reset';

export type RuntimeEventEntityType =
  | 'signal'
  | 'plan'
  | 'workflow'
  | 'job'
  | 'artifact'
  | 'approval'
  | 'runtime';

export type RuntimeEvent = {
  id: string;
  type: RuntimeEventType;
  entityType: RuntimeEventEntityType;
  entityId: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};
