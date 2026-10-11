import { formatCount, platformLabel, type PlatformTotal } from "@/lib/dashboard/analytics";

/**
 * Published posts per platform.
 *
 * This counts what actually went out, not reach: view counts need platform
 * insights APIs we have not integrated, and inventing them would make the
 * dashboard untrustworthy.
 */
export function PlatformBars({ totals }: { totals: readonly PlatformTotal[] }) {
  if (totals.length === 0) {
    return (
      <p className="text-xs text-ink-soft">
        Nothing published yet. Platforms appear here once a scheduled post goes out.
      </p>
    );
  }

  const max = Math.max(...totals.map((row) => row.published));

  return (
    <ul className="space-y-2.5">
      {totals.map((row) => (
        <li key={row.platform}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs text-ink">{platformLabel(row.platform)}</span>
            <span className="shrink-0 text-xs tabular-nums text-ink-soft">
              {formatCount(row.published)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cloud">
            <div
              style={{ width: `${Math.round((row.published / max) * 100)}%` }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
