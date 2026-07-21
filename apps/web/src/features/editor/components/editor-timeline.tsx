"use client";

import { Music } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { CAPTIONS, CLIPS, TIMELINE_DURATION_MS } from "@/lib/editor/data";
import { buildRuler, formatTimecode, toPercent } from "@/lib/editor/timeline";

import { type Playback } from "../hooks/use-playback";

const SEEK_STEP_MS = 1_000;

function TrackLabel({ height, children }: { height: string; children: ReactNode }) {
  return (
    <span
      className={`flex ${height} items-center pr-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft`}
    >
      {children}
    </span>
  );
}

/** Absolute placement of a timed span across the full project width. */
function span(startMs: number, endMs: number): { left: string; width: string } {
  const left = toPercent(startMs, TIMELINE_DURATION_MS);
  return { left: `${left}%`, width: `${toPercent(endMs, TIMELINE_DURATION_MS) - left}%` };
}

export function EditorTimeline({ playback }: { playback: Playback }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const ruler = buildRuler(TIMELINE_DURATION_MS);

  const seekFromPointer = (clientX: number): void => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) return;
    playback.seek(((clientX - bounds.left) / bounds.width) * TIMELINE_DURATION_MS);
  };

  return (
    <div className="shrink-0 border-t border-hairline bg-paper p-3">
      <div className="mb-2 flex justify-between pl-16 text-[10px] tabular-nums text-ink-soft">
        {ruler.map((tick) => (
          <span key={tick}>{formatTimecode(tick)}</span>
        ))}
      </div>

      <div className="flex">
        <div className="w-16 shrink-0 space-y-1.5">
          <TrackLabel height="h-11">Video</TrackLabel>
          <TrackLabel height="h-7">Captions</TrackLabel>
          <TrackLabel height="h-8">Music</TrackLabel>
        </div>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Playhead"
          aria-valuemin={0}
          aria-valuemax={TIMELINE_DURATION_MS}
          aria-valuenow={Math.round(playback.currentMs)}
          aria-valuetext={formatTimecode(playback.currentMs)}
          onPointerDown={(event) => seekFromPointer(event.clientX)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") playback.seek(playback.currentMs - SEEK_STEP_MS);
            else if (event.key === "ArrowRight") playback.seek(playback.currentMs + SEEK_STEP_MS);
            else if (event.key === "Home") playback.seek(0);
            else if (event.key === "End") playback.seek(TIMELINE_DURATION_MS);
            else return;
            event.preventDefault();
          }}
          className="relative min-w-0 flex-1 cursor-pointer space-y-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="relative h-11">
            {CLIPS.map((clip) => (
              <div
                key={clip.id}
                style={span(clip.startMs, clip.startMs + clip.durationMs)}
                className="absolute inset-y-0 flex items-center justify-center truncate rounded-md border border-hairline bg-cloud px-2 text-xs text-ink"
              >
                <span className="truncate">{clip.label}</span>
              </div>
            ))}
          </div>

          <div className="relative h-7">
            {CAPTIONS.map((caption) => (
              <div
                key={caption.id}
                style={span(caption.startMs, caption.endMs)}
                className="absolute inset-y-0 flex items-center truncate rounded-md border border-primary/20 bg-primary/10 px-2 text-[11px] text-primary"
              >
                <span className="truncate">{caption.text}</span>
              </div>
            ))}
          </div>

          <div className="flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-cloud px-2.5 text-[11px] text-ink-soft">
            <Music className="size-3.5 shrink-0" />
            Sunrise Run
          </div>

          <div
            aria-hidden
            style={{ left: `${toPercent(playback.currentMs, TIMELINE_DURATION_MS)}%` }}
            className="pointer-events-none absolute inset-y-0 w-px bg-primary"
          />
        </div>
      </div>
    </div>
  );
}
