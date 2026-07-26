import { cn } from "@/lib/utils";

/**
 * How strongly the sources supported a trend.
 *
 * Shown as a band rather than a percentage: the underlying number is a model's
 * judgement, and rendering "73%" would imply a precision it does not have.
 */
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const [label, tone] =
    confidence >= 0.7
      ? (["Strong signal", "bg-success/10 text-success"] as const)
      : confidence >= 0.4
        ? (["Emerging", "bg-cloud text-ink"] as const)
        : (["Early", "bg-cloud text-ink-soft"] as const);

  return (
    <span
      title={`Confidence ${confidence.toFixed(2)} of 1`}
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone)}
    >
      {label}
    </span>
  );
}
