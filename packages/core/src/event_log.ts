import type { RuntimeEvent } from '../../shared/src/types/runtime_event';
import { runtimeStore } from './state_store';

export function logEvent(event: Omit<RuntimeEvent, 'id' | 'timestamp'> & Partial<Pick<RuntimeEvent, 'id' | 'timestamp'>>): RuntimeEvent {
  const next: RuntimeEvent = {
    id: event.id ?? `evt_${runtimeStore.events.length + 1}`,
    timestamp: event.timestamp ?? Date.now(),
    ...event,
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
