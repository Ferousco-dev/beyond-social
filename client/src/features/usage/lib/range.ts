/**
 * The date ranges the usage page offers. Days rather than hours, because the
 * chart is one bar per calendar day and a sub-day window has nothing to plot.
 */
export const USAGE_RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
] as const;

export type UsageRangeId = (typeof USAGE_RANGES)[number]["id"];

export const DEFAULT_RANGE: UsageRangeId = "30d";

export function parseRange(value: string | undefined): UsageRangeId {
  return USAGE_RANGES.find((range) => range.id === value)?.id ?? DEFAULT_RANGE;
}

export function rangeDays(id: UsageRangeId): number {
  return USAGE_RANGES.find((range) => range.id === id)?.days ?? 30;
}

export function rangeLabel(id: UsageRangeId): string {
  return USAGE_RANGES.find((range) => range.id === id)?.label ?? "30 days";
}
