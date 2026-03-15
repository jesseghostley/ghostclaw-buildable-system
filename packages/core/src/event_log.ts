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

export function logEvent(event: Omit<RuntimeEvent, 'id' | 'timestamp'> & Partial<Pick<RuntimeEvent, 'id' | 'timestamp'>>): RuntimeEvent {
  const next: RuntimeEvent = {
    id: event.id ?? `evt_${runtimeStore.events.length + 1}`,
    timestamp: event.timestamp ?? Date.now(),
    ...event,
    message: normalizeMessage(event.message ?? defaultMessage(event as Omit<RuntimeEvent, 'id' | 'timestamp' | 'message'>)),
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
