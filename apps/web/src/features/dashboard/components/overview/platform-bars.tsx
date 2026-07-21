import { PLATFORM_REACH, formatCount } from "@/lib/dashboard/analytics";

/**
 * One hue for every bar: the platform is named on the row, so colour carries
 * magnitude only and never has to encode identity.
 */
export function PlatformBars() {
  const max = Math.max(...PLATFORM_REACH.map((row) => row.views));

  return (
    <ul className="space-y-2.5">
      {PLATFORM_REACH.map((row) => (
        <li key={row.platform}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-ink">{row.platform}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-soft">
              {formatCount(row.views)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cloud">
            <div
              style={{ width: `${Math.round((row.views / max) * 100)}%` }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
