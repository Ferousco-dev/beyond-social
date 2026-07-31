/**
 * The UTC bounds of a calendar day as the reader experiences it.
 *
 * "Filter to 3 August" means their 3 August, not UTC's. In Lagos those differ
 * by an hour and in Los Angeles by seven, so filtering on the raw UTC day would
 * silently drop the evening of the day the user asked for and add the evening
 * of the day before.
 *
 * The offset is measured at the instant in question rather than taken from a
 * fixed table, because it is not constant: a zone that observes DST has two
 * different offsets during the same year, and one of the days in the year is 23
 * or 25 hours long.
 */

/** How far the zone is from UTC at a given instant, in milliseconds. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  // `en-CA` gives ISO-ordered parts, which reassemble without locale guessing.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  // Hour 24 appears in some zones for midnight; Date.UTC normalises it anyway.
  const asUtc = Date.UTC(
    Number(lookup("year")),
    Number(lookup("month")) - 1,
    Number(lookup("day")),
    Number(lookup("hour")),
    Number(lookup("minute")),
    Number(lookup("second")),
  );
  return asUtc - at.getTime();
}

/** The instant local midnight of `day` occurs at, in that zone. */
function localMidnightUtc(day: string, timeZone: string): Date {
  const naive = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(naive.getTime())) return naive;

  // Two passes. The first offset is measured at the wrong instant (UTC
  // midnight), which lands on the wrong side of a DST transition when the
  // change happens overnight; re-measuring at the corrected instant settles it.
  const first = new Date(naive.getTime() - zoneOffsetMs(naive, timeZone));
  return new Date(naive.getTime() - zoneOffsetMs(first, timeZone));
}

export interface DayRange {
  /** Inclusive lower bound, ISO. */
  readonly from: string;
  /** Exclusive upper bound, ISO. */
  readonly to: string;
}

/**
 * Half-open so a row timestamped at exactly midnight belongs to one day only.
 * A closed range would show it on both.
 */
export function zonedDayRange(day: string, timeZone: string): DayRange | null {
  const start = localMidnightUtc(day, timeZone);
  if (Number.isNaN(start.getTime())) return null;

  // Advancing the calendar date rather than adding 24 hours, so the 23- and
  // 25-hour days around a DST transition still cover exactly one day.
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, date + 1));
  const next = localMidnightUtc(nextDay.toISOString().slice(0, 10), timeZone);

  return { from: start.toISOString(), to: next.toISOString() };
}
