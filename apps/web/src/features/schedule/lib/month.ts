import { type ScheduledPost } from "./types";

/**
 * Laying a month out as a grid, in the reader's zone.
 *
 * The day a post belongs to is the day it is in for the person reading, not in
 * UTC. A post at 23:30 in Lagos is the 4th there and the 4th is where it must
 * appear, even though the stored instant is the 4th at 22:30 UTC and would land
 * on a different date for a reader in Auckland.
 *
 * So every date here is a `YYYY-MM-DD` key produced by a formatter pinned to the
 * zone, and nothing uses the runtime's own local time.
 */

/** Grid rows are whole weeks, so a month occupies five or six of them. */
const DAYS_PER_WEEK = 7;

export interface MonthDay {
  /** `YYYY-MM-DD` in the reader's zone. */
  readonly key: string;
  readonly dayOfMonth: number;
  /** False for the leading and trailing days that pad the grid to whole weeks. */
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly posts: readonly ScheduledPost[];
}

/** `YYYY-MM-DD` for an instant, as it reads in the given zone. */
export function dayKey(date: Date, timeZone: string): string {
  // en-CA gives ISO-ordered parts, which is the whole reason it is used here.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The month a key belongs to, as `YYYY-MM`. */
export function monthKey(key: string): string {
  return key.slice(0, 7);
}

/** Steps a `YYYY-MM` key by whole months, without touching the day. */
export function shiftMonth(month: string, by: number): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, index - 1 + by, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** How that month reads as a heading, e.g. "March 2026". */
export function monthLabel(month: string): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, index - 1, 1)));
}

/**
 * How a `YYYY-MM-DD` key reads as a heading, e.g. "Thursday 13 August".
 *
 * Built in UTC from the key's own numbers, for the same reason as the month
 * label beside it: a calendar square is a date, not a moment, and formatting it
 * in a zone can move it a day.
 */
export function dayLabel(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * The cells of one month, padded to whole weeks and carrying their posts.
 *
 * The grid is built in UTC from the month's own numbers rather than from any
 * instant, because a calendar square is a date rather than a moment. Only the
 * bucketing of posts is zone-aware, which is the one place it matters.
 */
export function buildMonth(
  month: string,
  posts: readonly ScheduledPost[],
  timeZone: string,
  now: Date,
): readonly MonthDay[] {
  const [year = 0, index = 1] = month.split("-").map(Number);

  const byDay = new Map<string, ScheduledPost[]>();
  for (const post of posts) {
    const date = new Date(post.scheduledFor);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date, timeZone);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(post);
    else byDay.set(key, [post]);
  }

  const first = new Date(Date.UTC(year, index - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate();

  // Weeks start on Monday, which is how a posting schedule is usually read.
  const leading = (first.getUTCDay() + 6) % DAYS_PER_WEEK;
  const total = Math.ceil((leading + daysInMonth) / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const today = dayKey(now, timeZone);

  return Array.from({ length: total }, (_, cell) => {
    const date = new Date(Date.UTC(year, index - 1, cell - leading + 1));
    const key = dayKey(date, "UTC");

    return {
      key,
      dayOfMonth: date.getUTCDate(),
      inMonth: cell >= leading && cell < leading + daysInMonth,
      isToday: key === today,
      posts: byDay.get(key) ?? [],
    };
  });
}
