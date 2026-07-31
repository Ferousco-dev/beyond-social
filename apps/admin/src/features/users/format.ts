/**
 * Dates as this feature shows them.
 *
 * Fixed locale and UTC throughout, matching `lib/format`, so server markup is
 * stable and two operators reading the same account read the same instant.
 */

const INSTANT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function formatInstant(value: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : `${INSTANT.format(parsed)} UTC`;
}

export function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : DATE.format(parsed);
}
