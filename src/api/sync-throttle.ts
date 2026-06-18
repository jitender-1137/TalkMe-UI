/**
 * Lightweight client-side throttle for background sync calls.
 *
 * Dexie background-sync effects (chat list, single chat, latest messages)
 * re-run on mount and on token change. WebSocket reconnects and component
 * remounts can fire several of these in quick succession, which drains the
 * backend rate limiter and triggers 429s. `shouldSync` guards a given key so
 * the same sync runs at most once per `minIntervalMs` — the local Dexie cache
 * already serves the data in between.
 */
const lastRun = new Map<string, number>();

const DEFAULT_INTERVAL_MS = 4000;

export function shouldSync(key: string, minIntervalMs: number = DEFAULT_INTERVAL_MS): boolean {
  const now = Date.now();
  const prev = lastRun.get(key) ?? 0;
  if (now - prev < minIntervalMs) return false;
  lastRun.set(key, now);
  return true;
}

/** Clear a throttle key so the next sync runs immediately (e.g. after a mutation). */
export function resetSyncThrottle(key: string): void {
  lastRun.delete(key);
}
