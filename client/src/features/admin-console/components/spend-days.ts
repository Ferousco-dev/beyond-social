/** The periods AI spend can show, in days. Plain values, so server and browser code can both read them. */
export const WINDOWS = [7, 30, 90] as const;
export type Window = (typeof WINDOWS)[number];

export interface SpendDay {
  readonly date: string;
  readonly cost: number;
}

/** Every day of the window, oldest first, with zero where nothing was spent. */
export function everyDay(days: number, rows: readonly { date: string; estimatedCostUsd: number }[]): SpendDay[] {
  const byDate = new Map(rows.map((row) => [row.date.slice(0, 10), row.estimatedCostUsd]));
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1 - index)));
    const key = date.toISOString().slice(0, 10);
    return { date: key, cost: byDate.get(key) ?? 0 };
  });
}
