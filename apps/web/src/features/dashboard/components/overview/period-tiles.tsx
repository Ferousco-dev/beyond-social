import { type ReactNode } from "react";

import { CreditTile } from "./credit-tile";
import { WINDOW_LABEL, type CreditBalance, type PeriodCounts } from "./types";

interface Tile {
  readonly label: string;
  readonly value: number;
  readonly detail: string;
}

/**
 * Counts only, each one scoped to the same window.
 *
 * A bare "12 videos" tells a reader nothing about whether that is a busy month
 * or a quiet one, so the timeframe is part of the label, not a footnote.
 */
function buildTiles(counts: PeriodCounts): readonly Tile[] {
  return [
    {
      label: `Videos generated, ${WINDOW_LABEL.toLowerCase()}`,
      value: counts.generated,
      detail:
        counts.generated === 0
          ? "Nothing generated yet"
          : `${counts.ready} ready, ${counts.failed} failed`,
    },
    {
      label: `Posts published, ${WINDOW_LABEL.toLowerCase()}`,
      value: counts.published,
      detail: counts.published === 0 ? "Nothing published yet" : "Across connected platforms",
    },
    {
      label: `Projects started, ${WINDOW_LABEL.toLowerCase()}`,
      value: counts.projectsStarted,
      detail: counts.projectsStarted === 0 ? "No new projects" : "New conversations",
    },
  ];
}

export function PeriodTiles({
  counts,
  credits,
}: {
  readonly counts: PeriodCounts;
  readonly credits: CreditBalance | null;
}): ReactNode {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {buildTiles(counts).map((tile) => (
        <div key={tile.label} className="rounded-xl border border-hairline bg-paper p-3.5">
          <dt className="text-xs text-ink-soft">{tile.label}</dt>
          <dd className="mt-1.5">
            <span className="text-2xl font-semibold tabular-nums leading-none text-ink">
              {tile.value}
            </span>
            <span className="mt-1.5 block truncate text-xs text-ink-soft">{tile.detail}</span>
          </dd>
        </div>
      ))}
      <CreditTile credits={credits} />
    </dl>
  );
}
