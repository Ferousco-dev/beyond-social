import { type ReactNode } from "react";

/**
 * A single figure with its label. Shared by every panel that reports a number,
 * so a count on the overview and a count on the health page are the same object
 * rather than two that drift apart.
 */

export type MetricTone = "neutral" | "warning" | "critical";

const TONE: Record<MetricTone, string> = {
  neutral: "text-ink",
  warning: "text-warning",
  critical: "text-destructive",
};

export function MetricRow({ children }: { children: ReactNode }): ReactNode {
  return <dl className="mb-4 flex flex-wrap gap-x-10 gap-y-3 last:mb-0">{children}</dl>;
}

export function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  /** One line under the figure, for a caveat the number cannot carry itself. */
  hint?: string;
  tone?: MetricTone;
}): ReactNode {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={`mt-1 text-2xl font-medium tabular-nums ${TONE[tone]}`}>{value}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-ink-soft">{hint}</dd> : null}
    </div>
  );
}
