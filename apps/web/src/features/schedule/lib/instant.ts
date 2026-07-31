/**
 * Converts a local wall clock in a named zone to the instant it refers to.
 *
 * Done by asking the formatter what a candidate instant looks like in the zone
 * and correcting by the difference, because there is no built-in inverse. Two
 * passes because the offset itself depends on the date, which is the whole
 * reason a zone is stored rather than an offset.
 *
 * This repeats the private `toInstant` in `features/publishing/actions.ts`.
 * Both belong in `lib/time`, but that file is owned elsewhere in this workflow,
 * so the duplicate is deliberate and flagged rather than a second seam invented
 * by accident.
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

/**
 * The other direction: an instant as the `YYYY-MM-DDTHH:mm` a datetime input
 * wants, in the reader's zone. Only for prefilling that input. Anything a
 * person reads goes through `describeSchedule` instead.
 */
export function toLocalInput(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  // en-CA gives ISO-ordered date parts, and hour12:false can render midnight as
  // "24", which no input will accept.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
