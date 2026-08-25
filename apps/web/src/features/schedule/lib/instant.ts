/**
 * The other direction: an instant as the `YYYY-MM-DDTHH:mm` a datetime input
 * wants, in the reader's zone. Only for prefilling that input. Anything a
 * person reads goes through `describeSchedule` instead.
 *
 * `toInstant`, the local-to-instant half, lives in `@/lib/time/zone` alongside
 * the rest of the zone conversions.
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
