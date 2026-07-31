/**
 * One fixed rendering of a change time, in UTC like every other timestamp in
 * the console, so server markup matches the client and two operators comparing
 * a change against a log line are reading the same clock.
 */
const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatChangedAt(value: Date): string {
  return `${TIMESTAMP.format(value)} UTC`;
}

/** "Never changed" is the truth for a seeded row, and worth saying plainly. */
export function formatChangedBy(email: string | null): string {
  return email ?? "Seeded value, never changed";
}
