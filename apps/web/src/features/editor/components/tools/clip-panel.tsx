"use client";

import { type Clip } from "@/lib/editor/data";
import { formatTimecode } from "@/lib/editor/timeline";

import { MIN_CLIP_MS, type ClipEdge } from "../../hooks/use-clips";

const NUDGE_MS = 250;

export function ClipPanel({
  clip,
  onTrim,
  onSeek,
}: {
  clip: Clip;
  onTrim: (edge: ClipEdge, ms: number) => void;
  onSeek: (ms: number) => void;
}) {
  const endMs = clip.startMs + clip.durationMs;
  const rows: ReadonlyArray<{ edge: ClipEdge; label: string; value: number }> = [
    { edge: "start", label: "Start", value: clip.startMs },
    { edge: "end", label: "End", value: endMs },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink">{clip.label}</p>
        <p className="mt-0.5 text-xs tabular-nums text-ink-soft">
          {formatTimecode(clip.durationMs)} long
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.edge} className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSeek(row.value)}
              className="cursor-pointer text-xs text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {row.label} {formatTimecode(row.value)}
            </button>

            <div className="flex items-center gap-1">
              {[-NUDGE_MS, NUDGE_MS].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={`Move ${row.label.toLowerCase()} ${delta < 0 ? "earlier" : "later"}`}
                  onClick={() => onTrim(row.edge, row.value + delta)}
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-hairline text-xs text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {delta < 0 ? "-" : "+"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Trimming stops at the neighbouring clips and at {MIN_CLIP_MS / 1000}s long.
      </p>
    </div>
  );
}
