import { type ReactNode } from "react";

/**
 * Wraps one health panel with a scannable count badge. A zero renders quiet
 * (`neutral` panels never turn destructive, since a busy rate-limit scope is
 * not inherently bad); anything above zero on the other panels reads as a
 * warning, because it names something actually broken.
 */
export function HealthSection({
  title,
  count,
  observedAt,
  countLabel,
  neutral = false,
  children,
}: {
  readonly title: string;
  readonly count: number | null;
  readonly observedAt: string | null;
  readonly countLabel?: string;
  readonly neutral?: boolean;
  readonly children: ReactNode;
}) {
  const warn = !neutral && count !== null && count > 0;

  return (
    <section className="rounded-xl border border-hairline bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
            count === null
              ? "bg-cloud text-ink-soft"
              : warn
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success"
          }`}
        >
          {count === null ? "unavailable" : `${count} ${countLabel ?? ""}`.trim()}
        </span>
      </div>
      {observedAt && (
        <p className="mt-1 text-[11px] text-ink-soft">
          as of {new Date(observedAt).toLocaleTimeString()}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}
