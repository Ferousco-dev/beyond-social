import { type UsageRow } from "./types";

const HEADERS = [
  "day",
  "model",
  "runs",
  "succeeded",
  "failed",
  "credits_spent",
  "credits_refunded",
  "credits_net",
] as const;

/** Quote only what has to be quoted, and double any embedded quote, per RFC 4180. */
function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * The rows behind the chart, verbatim. The chart sums them by day and the
 * breakdown sums them by model, so the export is the same arithmetic at a
 * finer grain rather than a separate query that could disagree.
 */
export function toCsv(rows: readonly UsageRow[]): string {
  const lines = rows.map((row) =>
    [
      row.day,
      row.model,
      row.runs,
      row.succeeded,
      row.failed,
      row.creditsSpent,
      row.creditsRefunded,
      row.creditsSpent - row.creditsRefunded,
    ]
      .map(cell)
      .join(","),
  );

  return [HEADERS.join(","), ...lines].join("\n") + "\n";
}
