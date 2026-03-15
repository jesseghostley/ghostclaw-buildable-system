type EventHandler = (payload: unknown) => void;

class EventBus {
  private readonly listeners = new Map<string, EventHandler[]>();

  emit(eventName: string, payload: unknown): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }

  on(eventName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.push(handler);
    } else {
      this.listeners.set(eventName, [handler]);
    }
  }

  off(eventName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventName);
    if (!handlers) {
      return;
    }
    const updated = handlers.filter((h) => h !== handler);
    if (updated.length === 0) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.set(eventName, updated);
    }
  }

  reset(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
