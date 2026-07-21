"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";

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
  onMove,
  msFromClientX,
}: {
  clip: Clip;
  pxPerSecond: number;
  selected: boolean;
  onSelect: () => void;
  onTrim: (edge: ClipEdge, ms: number) => void;
  onMove: (startMs: number) => void;
  msFromClientX: (clientX: number) => number;
}) {
  const [dragging, setDragging] = useState(false);

  /** Drags the whole clip, holding the grab point steady under the pointer. */
  const startDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    onSelect();

    const grabOffsetMs = msFromClientX(event.clientX) - clip.startMs;
    let moved = false;

    const move = (moveEvent: PointerEvent): void => {
      if (!moved) {
        moved = true;
        setDragging(true);
      }
      onMove(msFromClientX(moveEvent.clientX) - grabOffsetMs);
    };
    const end = (): void => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const nudgeByKey = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === "ArrowLeft") onMove(clip.startMs - KEYBOARD_TRIM_MS);
    else if (event.key === "ArrowRight") onMove(clip.startMs + KEYBOARD_TRIM_MS);
    else if (event.key === "Enter" || event.key === " ") onSelect();
    else return;
    event.preventDefault();
  };

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
      style={{
        left: msToPx(clip.startMs, pxPerSecond),
        width: msToPx(clip.durationMs, pxPerSecond),
      }}
      className="absolute inset-y-0"
    >
      {/* The clip surface and its handles are siblings: nesting controls inside
          a control would leave the handles unreachable to assistive tech. */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${clip.label} clip`}
        onPointerDown={startDrag}
        // Assistive tech activates with a click and no pointer events, so
        // selection cannot live on the drag handler alone.
        onClick={onSelect}
        onKeyDown={nudgeByKey}
        style={{ backgroundImage: FILMSTRIP }}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-md border bg-cloud px-2 text-xs text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          dragging ? "cursor-grabbing opacity-80" : "cursor-grab",
          selected ? "border-primary" : "border-hairline hover:border-ink-soft",
        )}
      >
        <span className="pointer-events-none block truncate">{clip.label}</span>
      </button>

      {selected
        ? (["start", "end"] as const).map((edge) => (
            <button
              key={edge}
              type="button"
              aria-label={`Trim ${clip.label} ${edge}`}
              onPointerDown={startTrim(edge)}
              onKeyDown={trimByKey(edge)}
              className={cn(
                "absolute inset-y-0 z-10 w-2.5 cursor-ew-resize bg-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
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
