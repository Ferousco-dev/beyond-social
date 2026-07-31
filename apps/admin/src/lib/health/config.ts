/**
 * Thresholds that decide what counts as "stuck".
 *
 * They live here rather than in the SQL defaults so the number an operator sees
 * on screen and the number the query used are provably the same value.
 */
export const HEALTH_THRESHOLDS = {
  /** kie.ai renders finish well inside this. Past it, the callback never came. */
  generatingStaleMinutes: 20,
  /** A platform upload is seconds of work, so five minutes means the worker died. */
  publishingStaleMinutes: 5,
  /** Lookback for failure and usage panels. */
  windowHours: 24,
  /** Rows returned per list panel. Counts are always exact, the lists are not. */
  listLimit: 20,
} as const;

export function windowStart(hours: number = HEALTH_THRESHOLDS.windowHours): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

export function minutesInterval(minutes: number): string {
  return `${minutes} minutes`;
}
