import { eventBus } from '../packages/core/src/event_bus';

beforeEach(() => {
  eventBus.reset();
});

describe('eventBus', () => {
  describe('on / emit', () => {
    it('calls registered handler when event is emitted', () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { data: 42 });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 42 });
    });

    it('calls multiple handlers for the same event', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      eventBus.on('test.event', h1);
      eventBus.on('test.event', h2);
      eventBus.emit('test.event', 'payload');
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('does not call handlers for different events', () => {
      const handler = jest.fn();
      eventBus.on('event.a', handler);
      eventBus.emit('event.b', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing when no handlers are registered for the event', () => {
      expect(() => eventBus.emit('no.listeners', {})).not.toThrow();
    });
  });

  describe('off', () => {
    it('removes a specific handler', () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);
      eventBus.off('test.event', handler);
      eventBus.emit('test.event', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('only removes the specified handler, not others', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      eventBus.on('test.event', h1);
      eventBus.on('test.event', h2);
      eventBus.off('test.event', h1);
      eventBus.emit('test.event', {});
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('does nothing when removing a handler that was never registered', () => {
      const handler = jest.fn();
      expect(() => eventBus.off('nonexistent.event', handler)).not.toThrow();
    });
  });

  describe('reset', () => {
    it('clears all listeners', () => {
      const handler = jest.fn();
      eventBus.on('event.a', handler);
      eventBus.on('event.b', handler);
      eventBus.reset();
      eventBus.emit('event.a', {});
      eventBus.emit('event.b', {});
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('skill invocation events', () => {
    it('emits skill.invocation.started', () => {
      const handler = jest.fn();
      eventBus.on('skill.invocation.started', handler);
      eventBus.emit('skill.invocation.started', { id: 'inv_1', status: 'running' });
      expect(handler).toHaveBeenCalledWith({ id: 'inv_1', status: 'running' });
    });

    it('emits skill.invocation.completed', () => {
      const handler = jest.fn();
      eventBus.on('skill.invocation.completed', handler);
      eventBus.emit('skill.invocation.completed', { id: 'inv_1', status: 'completed' });
      expect(handler).toHaveBeenCalledWith({ id: 'inv_1', status: 'completed' });
    });

    it('emits skill.invocation.failed', () => {
      const handler = jest.fn();
      eventBus.on('skill.invocation.failed', handler);
      eventBus.emit('skill.invocation.failed', { id: 'inv_1', status: 'failed' });
      expect(handler).toHaveBeenCalledWith({ id: 'inv_1', status: 'failed' });
    });
  });
});
