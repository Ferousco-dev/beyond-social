"use client";

import { type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { trackPointer } from "../../lib/pointer";

export type DragMode = "move" | "start" | "end";

interface TimelineItemProps {
  start: number;
  end: number;
  zoom: number;
  label: string;
  selected: boolean;
  className: string;
  onSelect: () => void;
  /** Called on every pointer move with the item's pre-drag position shifted by `seconds`. */
  onDrag: (mode: DragMode, seconds: number) => void;
  onDragEnd: () => void;
  children?: ReactNode;
}

export function TimelineItem({ start, end, zoom, label, selected, className, onSelect, onDrag, onDragEnd, children }: TimelineItemProps) {
  const begin = (event: ReactPointerEvent<HTMLElement>, mode: DragMode): void => {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect();
    trackPointer(event, (dx) => onDrag(mode, dx / zoom), undefined, onDragEnd);
  };

  const rawWidth = Math.max(2, (end - start) * zoom);
  const gap = rawWidth > 8 ? 1.5 : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
      onPointerDown={(event) => begin(event, "move")}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect();
      }}
      className={cn(
        "group/item absolute inset-y-0 cursor-grab select-none overflow-hidden rounded-md border border-white/15 text-[11px] text-white outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background",
        className,
      )}
      style={{ left: start * zoom + gap, width: Math.max(2, rawWidth - gap * 2) }}
    >
      {children}
      {(["start", "end"] as const).map((side) => (
        <span
          key={side}
          aria-hidden
          onPointerDown={(event) => begin(event, side)}
          className={cn(
            "absolute inset-y-0 z-10 w-2 cursor-ew-resize bg-white/0 transition-colors group-hover/item:bg-white/25",
            side === "start" ? "left-0" : "right-0",
          )}
        />
      ))}
    </div>
  );
}
