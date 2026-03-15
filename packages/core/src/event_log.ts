import type { RuntimeEvent } from '../../shared/src/types/runtime_event';
import { runtimeStore } from './state_store';

function humanizeType(type: RuntimeEvent['type']): string {
  return type.replace(/_/g, ' ');
}

function defaultMessage(event: Omit<RuntimeEvent, 'id' | 'timestamp' | 'message'>): string {
  const base = humanizeType(event.type);
  const entity = `${event.entityType} ${event.entityId}`;
  return `${base}: ${entity}`;
}

function normalizeMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Runtime event recorded.';
  }

  return trimmed;
}

function normalizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };

  const relatedIds = {
    signalId: typeof next.signalId === 'string' ? next.signalId : undefined,
    planId: typeof next.planId === 'string' ? next.planId : undefined,
    workflowId: typeof next.workflowId === 'string' ? next.workflowId : undefined,
    jobId: typeof next.jobId === 'string' ? next.jobId : undefined,
    artifactId: typeof next.artifactId === 'string' ? next.artifactId : undefined,
  };

  if (!relatedIds.signalId && typeof next.entitySignalId === 'string') {
    relatedIds.signalId = next.entitySignalId;
  }

  if (!relatedIds.planId && typeof next.entityPlanId === 'string') {
    relatedIds.planId = next.entityPlanId;
  }

  if (!relatedIds.jobId && typeof next.entityJobId === 'string') {
    relatedIds.jobId = next.entityJobId;
  }

  if (!relatedIds.artifactId && typeof next.entityArtifactId === 'string') {
    relatedIds.artifactId = next.entityArtifactId;
  }

  next.relatedIds = relatedIds;

  return next;
}

export function logEvent(event: Omit<RuntimeEvent, 'id' | 'timestamp'> & Partial<Pick<RuntimeEvent, 'id' | 'timestamp'>>): RuntimeEvent {
  const next: RuntimeEvent = {
    id: event.id ?? `evt_${runtimeStore.events.length + 1}`,
    timestamp: event.timestamp ?? Date.now(),
    ...event,
    message: normalizeMessage(event.message ?? defaultMessage(event as Omit<RuntimeEvent, 'id' | 'timestamp' | 'message'>)),
    metadata: normalizeMetadata(event.metadata),
  };

  runtimeStore.events.push(next);
  return next;
}

export function listEvents(): RuntimeEvent[] {
  return runtimeStore.events;
}

export function listEventsForEntity(entityType: RuntimeEvent['entityType'], entityId: string): RuntimeEvent[] {
  return runtimeStore.events.filter((event) => event.entityType === entityType && event.entityId === entityId);
}

export function clearEvents(): void {
  runtimeStore.events.length = 0;
}
