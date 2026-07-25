"use client";

import { Music, Type } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { msToPx } from "@/lib/editor/timeline";
import { isAudio, isText, isVideo, type EditorItem, type TrackKind } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

import { type ItemEdge } from "../../hooks/use-editor-state";

const KEYBOARD_TRIM_MS = 250;

/**
 * Frame ticks stand in for filmstrip thumbnails until real media is attached.
 * Drawn from tokens rather than an image so the clip stays themeable.
 */
const FILMSTRIP = "repeating-linear-gradient(90deg, transparent 0 14px, var(--hairline) 14px 15px)";

/** Per-kind surface treatment, so a glance at the timeline reads the structure. */
const SURFACE: Record<TrackKind, string> = {
  video: "bg-cloud text-ink",
  overlay: "bg-primary/15 text-ink",
  text: "bg-primary/10 text-primary",
  audio: "bg-success/10 text-success",
};

function label(item: EditorItem): string {
  if (isVideo(item)) return item.label;
  if (isText(item)) return item.text;
  return item.title;
}

export function TimelineItem({
  item,
  trackKind,
  pxPerSecond,
  selected,
  locked,
  onSelect,
  onTrim,
  onMove,
  msFromClientX,
}: {
  item: EditorItem;
  trackKind: TrackKind;
  pxPerSecond: number;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
  onTrim: (edge: ItemEdge, ms: number) => void;
  onMove: (startMs: number) => void;
  msFromClientX: (clientX: number) => number;
}) {
  const [dragging, setDragging] = useState(false);
  const name = label(item);

  /** Drags the whole item, holding the grab point steady under the pointer. */
  const startDrag = (event: ReactPointerEvent<HTMLElement>): void => {
    event.stopPropagation();
    onSelect();
    if (locked) return;

    const grabOffsetMs = msFromClientX(event.clientX) - item.startMs;
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
    if (locked) return;
    if (event.key === "ArrowLeft") onMove(item.startMs - KEYBOARD_TRIM_MS);
    else if (event.key === "ArrowRight") onMove(item.startMs + KEYBOARD_TRIM_MS);
    else if (event.key === "Enter" || event.key === " ") onSelect();
    else return;
    event.preventDefault();
  };

  const startTrim = (edge: ItemEdge) => (event: ReactPointerEvent<HTMLButtonElement>) => {
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

  const trimByKey = (edge: ItemEdge) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const anchor = edge === "start" ? item.startMs : item.startMs + item.durationMs;
    if (event.key === "ArrowLeft") onTrim(edge, anchor - KEYBOARD_TRIM_MS);
    else if (event.key === "ArrowRight") onTrim(edge, anchor + KEYBOARD_TRIM_MS);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      style={{
        left: msToPx(item.startMs, pxPerSecond),
        width: msToPx(item.durationMs, pxPerSecond),
      }}
      className="absolute inset-y-0"
    >
      {/* The surface and its handles are siblings: nesting controls inside a
          control would leave the handles unreachable to assistive tech. */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${name} on ${trackKind} track`}
        onPointerDown={startDrag}
        // Assistive tech activates with a click and no pointer events, so
        // selection cannot live on the drag handler alone.
        onClick={onSelect}
        onKeyDown={nudgeByKey}
        style={trackKind === "video" ? { backgroundImage: FILMSTRIP } : undefined}
        className={cn(
          "absolute inset-0 flex items-center gap-1.5 overflow-hidden rounded-md border px-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          SURFACE[trackKind],
          locked ? "cursor-not-allowed" : dragging ? "cursor-grabbing opacity-80" : "cursor-grab",
          selected ? "border-primary" : "border-hairline hover:border-ink-soft",
        )}
      >
        {isText(item) ? <Type className="size-3 shrink-0" aria-hidden /> : null}
        {isAudio(item) ? <Music className="size-3 shrink-0" aria-hidden /> : null}
        <span className="pointer-events-none block truncate">{name}</span>
        {isVideo(item) && item.speed !== 1 ? (
          <span className="ml-auto shrink-0 rounded bg-ink/15 px-1 text-[10px] tabular-nums">
            {item.speed}x
          </span>
        ) : null}
      </button>

      {/* Transition marker sits on the incoming edge, as in a real NLE. */}
      {isVideo(item) && item.transitionIn !== "none" ? (
        <span
          aria-hidden
          title={item.transitionIn}
          className="pointer-events-none absolute -left-1 top-1/2 z-10 size-2.5 -translate-y-1/2 rotate-45 rounded-[2px] border border-paper bg-primary"
        />
      ) : null}

      {selected && !locked
        ? (["start", "end"] as const).map((edge) => (
            <button
              key={edge}
              type="button"
              aria-label={`Trim ${name} ${edge}`}
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
