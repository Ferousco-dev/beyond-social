/**
 * Thresholds and window arithmetic for the debugging console.
 *
 * They live here rather than in the SQL defaults so the number an operator
 * reads on screen and the number the query used are provably the same value.
 * The same reasoning as the health console, and deliberately the same numbers:
 * two pages disagreeing about what "stuck" means is a way to argue about an
 * incident instead of fixing it.
 */
export const DEBUG_THRESHOLDS = {
  /** kie.ai renders finish well inside this. Past it, the callback never came. */
  generatingStaleMinutes: 20,
  /** A platform upload is seconds of work, so five minutes means the worker died. */
  publishingStaleMinutes: 5,
  /** Rows per list. The counts beside them are exact, the lists are not. */
  listLimit: 50,
} as const;

export function minutesInterval(minutes: number): string {
  return `${minutes} minutes`;
}

/** Today in UTC, as the day picker's value. Queries run in UTC throughout. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The half-open [start, end) bounds of one UTC day, as ISO timestamps. */
export function dayBounds(day: string): { since: string; until: string } {
  const start = new Date(`${day}T00:00:00Z`);
  const end = new Date(start.getTime() + 86_400_000);
  return { since: start.toISOString(), until: end.toISOString() };
}
