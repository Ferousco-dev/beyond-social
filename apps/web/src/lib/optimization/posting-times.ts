/**
 * Recommended posting times.
 *
 * These are published engagement patterns for short-form video, not
 * measurements of this account. That distinction is the whole design: we have
 * no per-account engagement data yet, so the UI must present these as a
 * starting point rather than as "your best time", which would be a fabricated
 * personalisation.
 *
 * Times are local to the viewer, because a posting time is only meaningful in
 * the audience's timezone and the creator's own is the best available proxy.
 */

export const PLATFORM_WINDOWS: Readonly<Record<string, readonly number[]>> = {
  // Peak scroll on TikTok is late morning and again after work.
  tiktok: [11, 15, 19],
  // Instagram Reels skew to lunchtime and mid-evening.
  instagram: [12, 18, 21],
  // Facebook runs earlier: its audience skews older and checks in mid-morning.
  facebook: [9, 13, 16],
  // YouTube viewing concentrates in the evening and at weekends.
  youtube: [15, 18, 20],
};

/** Weekday preference, Sunday first, as a relative weight. */
const DAY_WEIGHTS: readonly number[] = [0.8, 0.9, 1, 1, 1, 0.95, 0.85];

export interface PostingSuggestion {
  /** Local ISO string suitable for a datetime-local input. */
  readonly value: string;
  readonly label: string;
  /** Why this slot, so the user can disagree with the reasoning. */
  readonly reason: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `datetime-local` wants local time with no timezone suffix. */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The next few good slots for a platform, always in the future.
 *
 * A suggestion in the past is worse than no suggestion: it looks like the tool
 * did not notice what time it is.
 */
export function suggestPostingTimes(
  platform: string,
  now: Date = new Date(),
  count = 3,
): readonly PostingSuggestion[] {
  const hours = PLATFORM_WINDOWS[platform] ?? PLATFORM_WINDOWS.tiktok ?? [12];
  const suggestions: PostingSuggestion[] = [];

  // Walk forward a day at a time so the first slot is genuinely the next one,
  // rather than today's schedule with past hours filtered out afterwards.
  for (let dayOffset = 0; dayOffset < 7 && suggestions.length < count; dayOffset += 1) {
    for (const hour of hours) {
      if (suggestions.length >= count) break;

      const slot = new Date(now);
      slot.setDate(now.getDate() + dayOffset);
      slot.setHours(hour, 0, 0, 0);
      // A slot needs enough lead time to be worth offering.
      if (slot.getTime() <= now.getTime() + 15 * 60_000) continue;

      const weight = DAY_WEIGHTS[slot.getDay()] ?? 1;
      suggestions.push({
        value: toLocalInputValue(slot),
        label: slot.toLocaleString(undefined, {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        }),
        reason:
          weight >= 1
            ? "Typically a high-engagement window for this platform"
            : "A quieter day, but still inside this platform's active window",
      });
    }
  }

  return suggestions;
}
