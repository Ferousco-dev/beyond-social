/** Pure formatters shared by the health panels. No data access here. */

/** "3h 12m", "18m", "44s". Coarse on purpose: nobody pages on a second. */
export function formatAge(from: Date, to: Date): string {
  const seconds = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** Percentage with one decimal, or null when the denominator makes it a lie. */
export function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function formatRate(value: number | null): string {
  return value === null ? "no calls" : `${value.toFixed(1)}%`;
}
