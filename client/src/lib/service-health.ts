/**
 * How many checks in a row must fail before people are told something is wrong.
 * One miss is often a slow wake-up or a dropped packet, and a banner that flickers
 * is worse than none.
 */
export const FAILURES_BEFORE_BANNER = 2;

/** The running count of failed checks after one more result. A success clears it. */
export function nextFailures(failures: number, ok: boolean): number {
  return ok ? 0 : failures + 1;
}

export function isDown(failures: number): boolean {
  return failures >= FAILURES_BEFORE_BANNER;
}

/** Seconds until the next check: quick while something is wrong, to clear the banner soon after. */
export function checkEverySeconds(failures: number): number {
  return failures > 0 ? 15 : 45;
}
