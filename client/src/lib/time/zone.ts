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

/**
 * Converts a local wall clock in a named zone to the instant it refers to.
 *
 * Done by asking the formatter what a candidate instant looks like in the zone
 * and correcting by the difference, because there is no built-in inverse. Two
 * passes because the offset itself depends on the date, which is the whole
 * reason a zone is stored rather than an offset.
 */
export function toInstant(local: string, timeZone: string): Date | null {
  const asUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;

  const offsetAt = (date: Date): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "0";
    const shifted = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")) % 24,
      Number(get("minute")),
      Number(get("second")),
    );
    return shifted - date.getTime();
  };

  const firstGuess = new Date(asUtc.getTime() - offsetAt(asUtc));
  return new Date(asUtc.getTime() - offsetAt(firstGuess));
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
