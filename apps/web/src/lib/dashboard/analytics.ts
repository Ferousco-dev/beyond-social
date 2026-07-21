export interface DailyViews {
  /** ISO date, so the label can be formatted for the reader's locale. */
  readonly date: string;
  readonly views: number;
}

export interface PlatformReach {
  readonly platform: string;
  readonly views: number;
}

export const VIEWS_LAST_7_DAYS: readonly DailyViews[] = [
  { date: "2026-07-15", views: 12_400 },
  { date: "2026-07-16", views: 18_900 },
  { date: "2026-07-17", views: 16_200 },
  { date: "2026-07-18", views: 27_500 },
  { date: "2026-07-19", views: 31_800 },
  { date: "2026-07-20", views: 24_600 },
  { date: "2026-07-21", views: 38_100 },
];

export const PLATFORM_REACH: readonly PlatformReach[] = [
  { platform: "TikTok", views: 412_600 },
  { platform: "Instagram", views: 268_300 },
  { platform: "YouTube Shorts", views: 154_900 },
  { platform: "Facebook", views: 61_200 },
];

/** Compact view counts, so a wide number never breaks a tile. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

/** Change between the first and last day, as a signed percentage. */
export function trendPercent(series: readonly DailyViews[]): number {
  const first = series[0]?.views;
  const last = series[series.length - 1]?.views;
  if (!first || !last) return 0;
  return Math.round(((last - first) / first) * 100);
}
