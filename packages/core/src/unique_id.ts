/**
 * Persistence-safe unique ID generator.
 *
 * Uses a timestamp (base-36) + random suffix so IDs never collide after
 * process restart, database reuse, or concurrent invocations.
 *
 * Format: {prefix}_{timestamp36}_{random6}
 * Example: signal_m1abc2d_k9f3x2
 *
 * All runtime modules should import this single helper instead of
 * maintaining their own counters.
 */
export function uniqueId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
