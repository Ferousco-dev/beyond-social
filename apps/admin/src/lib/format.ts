/**
 * Shared number and date formatting. Fixed locale and time zone throughout, so
 * server markup matches the client and two operators reading the same figure
 * read the same figure.
 */

const COUNT = new Intl.NumberFormat("en-US");

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Sub-cent AI costs are common, and rounding them to $0.00 hides real spend. */
const USD_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatCount(value: number): string {
  return COUNT.format(value);
}

export function formatUsd(value: number): string {
  return value > 0 && value < 0.01 ? USD_PRECISE.format(value) : USD.format(value);
}

/** An ISO date (YYYY-MM-DD) as a short day label, read in UTC like the query. */
export function formatDay(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? isoDate : DAY.format(parsed);
}
