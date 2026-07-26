/**
 * Product analytics types and formatters.
 *
 * Kept free of server imports because client components use the formatters.
 * The queries that produce this data live in `analytics-queries.ts`.
 */

export interface DailyActivity {
  /** ISO date, so the label can be formatted for the reader's locale. */
  readonly date: string;
  readonly generated: number;
  readonly ready: number;
}

export interface PlatformTotal {
  /** The `social_platform` enum value, not a display name. */
  readonly platform: string;
  readonly published: number;
}

export interface Funnel {
  readonly generated: number;
  readonly ready: number;
  readonly published: number;
}

export interface ProductAnalytics {
  readonly daily: readonly DailyActivity[];
  readonly platforms: readonly PlatformTotal[];
  readonly funnel: Funnel;
  /** False when nothing has happened yet, so the UI can say so honestly. */
  readonly hasData: boolean;
}

export const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

/** Compact counts, so a wide number never breaks a tile. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

/**
 * Change between the first and last day, as a signed percentage.
 *
 * A window starting at zero has no defined growth rate, so this reports none
 * rather than dressing up an infinity as a number.
 */
export function trendPercent(series: readonly DailyActivity[]): number | undefined {
  const first = series[0]?.generated;
  const last = series[series.length - 1]?.generated;
  if (!first || last === undefined) return undefined;
  return Math.round(((last - first) / first) * 100);
}

/** A continuous zeroed axis, so an empty account still renders a chart. */
export function emptyDays(days: number, today = new Date()): DailyActivity[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return { date: date.toISOString().slice(0, 10), generated: 0, ready: 0 };
  });
}
