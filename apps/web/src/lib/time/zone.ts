/**
 * Times, in the reader's timezone.
 *
 * The rule this file exists to enforce: an instant is stored once, in UTC, and
 * converted only at the edges where a person reads it. Nothing here writes a
 * local time anywhere, and nothing downstream should either.
 *
 * IANA names rather than offsets throughout. An offset is only true on the day
 * you measured it: "9am in New York" is 14:00 UTC in January and 13:00 UTC in
 * July, and a stored "UTC-5" gets the summer wrong for eight months of the year.
 */

/** Falls back to UTC, which is wrong for the reader but never wrong about the instant. */
export const DEFAULT_TIMEZONE = "UTC";

/**
 * Whether a string is a timezone this runtime can actually resolve.
 *
 * Checked by attempting the conversion rather than against a list, because the
 * list that matters is the one the formatter will use.
 */
export function isValidTimeZone(value: string): boolean {
  if (value === "" || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The zone the browser is in, e.g. `Africa/Lagos`. Client only. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function safeZone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

/** An absolute time as the reader would write it: `1 Aug, 09:00`. */
export function formatInZone(iso: string, timeZone: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(timeZone),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How far away an instant is, in either direction.
 *
 * The version this replaces computed `now - then` and described everything in
 * the past tense, so a post scheduled for next Tuesday rendered as "1h ago":
 * the negative difference fell through to a `Math.max(1, ...)` floor. A
 * scheduling feature that cannot say when something will happen is not one.
 */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMs = then - now;
  const future = diffMs > 0;
  const absMs = Math.abs(diffMs);

  const say = (value: string): string => (future ? `in ${value}` : `${value} ago`);

  if (absMs < MINUTE_MS) return future ? "in a moment" : "just now";
  if (absMs < HOUR_MS) return say(`${Math.round(absMs / MINUTE_MS)}m`);
  if (absMs < DAY_MS) return say(`${Math.round(absMs / HOUR_MS)}h`);

  const days = Math.round(absMs / DAY_MS);
  if (days === 1) return future ? "tomorrow" : "yesterday";
  return say(`${days} days`);
}

/**
 * What a scheduled post should read as.
 *
 * Both halves, because they answer different questions: "in 3 days" is the one
 * people scan for, and the absolute time is the one they check before changing
 * it. The absolute half is what needs the timezone.
 */
export function describeSchedule(iso: string, timeZone: string | null, now = Date.now()): string {
  const relative = relativeTime(iso, now);
  const absolute = formatInZone(iso, timeZone);
  if (relative === "" || absolute === "") return relative || absolute;
  return `${relative}, ${absolute}`;
}
