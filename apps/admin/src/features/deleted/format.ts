/**
 * Dates and grace periods as this feature shows them.
 *
 * Fixed locale and UTC, matching `lib/format`, so server markup is stable and
 * two operators reading the same account read the same instant. A deletion is
 * timed to the minute deliberately: it is the moment a 30 day clock started,
 * and a bare date cannot answer when the clock runs out.
 */

const INSTANT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function formatInstant(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : `${INSTANT.format(parsed)} UTC`;
}

export function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : DATE.format(parsed);
}

/** How much of the grace period is left, in words rather than a bare integer. */
export function formatGraceRemaining(days: number): string {
  if (days <= 0) return "Grace period over";
  return days === 1 ? "1 day left" : `${days} days left`;
}

/** Who asked for the deletion. Null means the account holder did it themselves. */
export function formatDeletedBy(adminEmail: string | null): string {
  return adminEmail ?? "The account holder";
}
