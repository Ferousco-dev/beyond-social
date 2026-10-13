/**
 * Turns a wall-clock time in a named zone into the instant it means. A
 * datetime-local input has no zone, and `new Date(value)` silently uses the
 * browser's, so a post scheduled "for 6pm" while viewing another zone would go
 * out at the wrong moment. Here the zone is always explicit.
 */

const FIELDS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** How far the zone is ahead of UTC at an instant, in minutes. */
function offsetMinutes(instant: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * `local` is "YYYY-MM-DDTHH:mm". Returns null when it is malformed or the zone
 * is unknown. In the hour a clock change skips, the later reading is used.
 */
export function zonedTimeToUtc(local: string, zone: string): Date | null {
  const match = FIELDS.exec(local);
  if (!match || !isValidZone(zone)) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const first = naive - offsetMinutes(naive, zone) * 60_000;
  const second = naive - offsetMinutes(first, zone) * 60_000;
  return new Date(second);
}

/** The zone the browser reports, or UTC when it reports none we can use. */
export function detectZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone && isValidZone(zone) ? zone : "UTC";
}
