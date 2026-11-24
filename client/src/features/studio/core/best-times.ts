/**
 * Suggested posting times. With the account's own history the times it has
 * done best at come first; without it, the hours each platform's audience is
 * commonly most active, in the audience's own time zone.
 */

export type SuggestPlatform = "youtube" | "tiktok" | "instagram";

/** A suggestion: the moment, written as the datetime-local value in the audience's zone, and why. */
export interface Suggestion {
  readonly local: string;
  readonly at: Date;
  readonly source: "history" | "general";
}

/** A slot learned from the account's own posts: a UTC weekday (0 is Sunday) and hour. */
export interface LearnedSlot {
  readonly weekday: number;
  readonly hour: number;
}

// Hours, in the audience's local time, when each platform's audience is
// commonly most active: lunch and evening on weekdays, late morning at weekends.
const COMMON: Readonly<Record<SuggestPlatform, { readonly weekday: readonly number[]; readonly weekend: readonly number[] }>> = {
  tiktok: { weekday: [12, 19, 21], weekend: [11, 19] },
  instagram: { weekday: [11, 13, 19], weekend: [10, 17] },
  youtube: { weekday: [15, 18], weekend: [10, 14] },
};

/** How many suggestions to show. */
const SHOW = 3;
/** A suggestion is at least this far ahead, so there is time to render and upload. */
const LEAD_MS = 30 * 60_000;

/** The calendar date, weekday and hour of an instant in a zone. */
function partsIn(at: Date, zone: string): { y: number; m: number; d: number; weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(at);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), weekday: days.indexOf(get("weekday")), hour: Number(get("hour")) };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** The instant a wall-clock time in a zone falls at. */
export function wallTimeToInstant(y: number, m: number, d: number, hour: number, zone: string): Date {
  // Start from the same numbers read as UTC, then correct by the zone's offset at that moment.
  const guess = Date.UTC(y, m - 1, d, hour);
  const seen = partsIn(new Date(guess), zone);
  const seenAsUtc = Date.UTC(seen.y, seen.m - 1, seen.d, seen.hour);
  return new Date(guess - (seenAsUtc - guess));
}

/** The next few good times to post, soonest first, at least half an hour away. */
export function suggestTimes(platforms: readonly SuggestPlatform[], zone: string, now: Date, learned: readonly LearnedSlot[] = []): Suggestion[] {
  const earliest = now.getTime() + LEAD_MS;
  const out: Suggestion[] = [];

  if (learned.length > 0) {
    // Learned slots are in UTC: find each one's next occurrence.
    for (const slot of learned) {
      const at = new Date(now);
      at.setUTCMinutes(0, 0, 0);
      at.setUTCHours(slot.hour);
      const ahead = (slot.weekday - at.getUTCDay() + 7) % 7;
      at.setUTCDate(at.getUTCDate() + ahead);
      if (at.getTime() < earliest) at.setUTCDate(at.getUTCDate() + 7);
      const p = partsIn(at, zone);
      out.push({ at, local: `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hour)}:00`, source: "history" });
    }
    return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, SHOW);
  }

  const chosen = platforms.length > 0 ? platforms : (["tiktok"] as const);
  const today = partsIn(now, zone);
  for (let offset = 0; offset < 7 && out.length < SHOW * 3; offset++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + offset, 12));
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const hours = new Set(chosen.flatMap((p) => (weekend ? COMMON[p].weekend : COMMON[p].weekday)));
    for (const hour of [...hours].sort((a, b) => a - b)) {
      const at = wallTimeToInstant(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, zone);
      if (at.getTime() < earliest) continue;
      out.push({ at, local: `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${pad(hour)}:00`, source: "general" });
    }
  }
  return out.slice(0, SHOW);
}

/** "Today 7 pm", "Tomorrow 12 pm", "Sat 11 am", read in the audience's zone. */
export function suggestionLabel(s: Suggestion, zone: string, now: Date): string {
  const day = partsIn(s.at, zone);
  const today = partsIn(now, zone);
  const tomorrow = partsIn(new Date(now.getTime() + 86_400_000), zone);
  const same = (a: typeof day, b: typeof day): boolean => a.y === b.y && a.m === b.m && a.d === b.d;
  const name = same(day, today) ? "Today" : same(day, tomorrow) ? "Tomorrow" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.weekday];
  const h = day.hour % 12 === 0 ? 12 : day.hour % 12;
  return `${name} ${h} ${day.hour < 12 ? "am" : "pm"}`;
}
