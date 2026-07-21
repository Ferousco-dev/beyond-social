"use client";

import { type PointerEvent as ReactPointerEvent } from "react";

import { type Clip } from "@/lib/editor/data";
import { msToPx } from "@/lib/editor/timeline";
import { cn } from "@/lib/utils";

import { type ClipEdge } from "../../hooks/use-clips";

const KEYBOARD_TRIM_MS = 250;

/**
 * Frame ticks stand in for filmstrip thumbnails until real media is attached.
 * They are drawn from tokens rather than an image so the clip stays themeable.
 */
const FILMSTRIP = "repeating-linear-gradient(90deg, transparent 0 14px, var(--hairline) 14px 15px)";

export function TimelineClip({
  clip,
  pxPerSecond,
  selected,
  onSelect,
  onTrim,
  msFromClientX,
}: {
  clip: Clip;
  pxPerSecond: number;
  selected: boolean;
  onSelect: () => void;
  onTrim: (edge: ClipEdge, ms: number) => void;
  msFromClientX: (clientX: number) => number;
}) {
  const startTrim = (edge: ClipEdge) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect();

    const move = (moveEvent: PointerEvent): void => onTrim(edge, msFromClientX(moveEvent.clientX));
    const end = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const trimByKey = (edge: ClipEdge) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const anchor = edge === "start" ? clip.startMs : clip.startMs + clip.durationMs;
    if (event.key === "ArrowLeft") onTrim(edge, anchor - KEYBOARD_TRIM_MS);
    else if (event.key === "ArrowRight") onTrim(edge, anchor + KEYBOARD_TRIM_MS);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${clip.label} clip`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
      style={{
        left: msToPx(clip.startMs, pxPerSecond),
        width: msToPx(clip.durationMs, pxPerSecond),
        backgroundImage: FILMSTRIP,
      }}
      className={cn(
        "absolute inset-y-0 cursor-pointer overflow-hidden rounded-md border bg-cloud transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary" : "border-hairline hover:border-ink-soft",
      )}
    >
      <span className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 truncate text-center text-xs text-ink">
        {clip.label}
      </span>

      {selected
        ? (["start", "end"] as const).map((edge) => (
            <button
              key={edge}
              type="button"
              aria-label={`Trim ${clip.label} ${edge}`}
              onPointerDown={startTrim(edge)}
              onKeyDown={trimByKey(edge)}
              className={cn(
                "absolute inset-y-0 w-2.5 cursor-ew-resize bg-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                edge === "start" ? "left-0 rounded-l-md" : "right-0 rounded-r-md",
              )}
            >
              <span className="mx-auto block h-4 w-px bg-paper" aria-hidden />
            </button>
          ))
        : null}
    </div>
  );
}
