import { uniqueId } from '../packages/core/src/unique_id';

describe('uniqueId', () => {
  it('produces IDs with the given prefix', () => {
    expect(uniqueId('signal')).toMatch(/^signal_/);
    expect(uniqueId('plan')).toMatch(/^plan_/);
    expect(uniqueId('job')).toMatch(/^job_/);
    expect(uniqueId('artifact')).toMatch(/^artifact_/);
    expect(uniqueId('pub')).toMatch(/^pub_/);
    expect(uniqueId('batch')).toMatch(/^batch_/);
    expect(uniqueId('audit')).toMatch(/^audit_/);
    expect(uniqueId('el')).toMatch(/^el_/);
  });

  it('never produces duplicate IDs in 10,000 sequential calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      ids.add(uniqueId('test'));
    }
    expect(ids.size).toBe(10_000);
  });

  it('never produces duplicate IDs across different prefixes', () => {
    const ids = new Set<string>();
    const prefixes = ['signal', 'plan', 'job', 'artifact', 'pub', 'batch', 'audit', 'el', 'assign', 'inv'];
    for (const prefix of prefixes) {
      for (let i = 0; i < 1_000; i++) {
        ids.add(uniqueId(prefix));
      }
    }
    expect(ids.size).toBe(10_000);
  });

  it('produces IDs that are valid for SQLite TEXT PRIMARY KEY', () => {
    for (let i = 0; i < 100; i++) {
      const id = uniqueId('signal');
      // No spaces, no special chars that would break SQL
      expect(id).toMatch(/^[a-z0-9_]+$/);
      // Reasonable length
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(40);
    }
  });

  it('format is {prefix}_{timestamp36}_{random6}', () => {
    const id = uniqueId('sig');
    const parts = id.split('_');
    // prefix + timestamp + random = 3 parts
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('sig');
    // timestamp part should be base-36 decodable
    const decoded = parseInt(parts[1], 36);
    expect(decoded).toBeGreaterThan(0);
    // random part should be 1-6 chars
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeLessThanOrEqual(6);
  });
});

describe('ID collision safety across simulated restarts', () => {
  it('IDs generated at different times never collide even with same prefix', () => {
    // Simulate: generate IDs, "restart" (clear all state), generate again
    const beforeRestart = new Set<string>();
    for (let i = 0; i < 100; i++) {
      beforeRestart.add(uniqueId('signal'));
      beforeRestart.add(uniqueId('job'));
      beforeRestart.add(uniqueId('plan'));
    }

    // "Restart" — uniqueId has no state to clear, that's the point
    const afterRestart = new Set<string>();
    for (let i = 0; i < 100; i++) {
      afterRestart.add(uniqueId('signal'));
      afterRestart.add(uniqueId('job'));
      afterRestart.add(uniqueId('plan'));
    }

    // No overlap
    for (const id of afterRestart) {
      expect(beforeRestart.has(id)).toBe(false);
    }
  });
});
