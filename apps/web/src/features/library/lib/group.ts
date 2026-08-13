import { type LibraryItem } from "../types";

/**
 * The library, cut into days.
 *
 * A flat grid answers "what do I have" and nothing else. The question people
 * actually arrive with is "where is the one from last week", and scanning an
 * undifferentiated wall of thumbnails for it is the slowest possible way to find
 * out. Dated headings turn that scan into a jump.
 *
 * Items keep the order they arrived in, which is newest first from the query.
 * Grouping in encounter order rather than sorting preserves that without this
 * module having to know about it.
 */

export interface LibraryDay {
  /** `YYYY-MM-DD`, stable across server and client, used as the React key. */
  readonly key: string;
  readonly items: readonly LibraryItem[];
}

export function groupByDay(items: readonly LibraryItem[]): readonly LibraryDay[] {
  const days = new Map<string, LibraryItem[]>();

  for (const item of items) {
    // The date part of the ISO string rather than a parsed Date: this runs
    // during render on both sides, and a key derived from the viewer's zone
    // would put the same item in different buckets on each.
    const key = item.createdAt.slice(0, 10);
    const bucket = days.get(key);
    if (bucket) bucket.push(item);
    else days.set(key, [item]);
  }

  return [...days].map(([key, dayItems]) => ({ key, items: dayItems }));
}

/**
 * How a day key reads as a heading.
 *
 * Formatted from the key's own numbers in UTC, because the key is a date rather
 * than a moment and formatting it in a zone can move it across midnight.
 */
export function dayHeading(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  const at = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(at.getTime())) return key;

  return at.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
