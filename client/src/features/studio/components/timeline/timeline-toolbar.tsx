"use client";

import { Magnet, Redo2, Scissors, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { STUDIO_ZOOM } from "../../config";
import { useStudio } from "../../store/editor-store";
import { useTimelineActions } from "../../hooks/use-timeline-actions";

function ToolButton({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4",
        active && "bg-cloud text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function TimelineToolbar() {
  const zoom = useStudio((s) => s.zoom);
  const snapping = useStudio((s) => s.snapping);
  const selection = useStudio((s) => s.selection);
  const canUndo = useStudio((s) => s.history.past.length > 0);
  const canRedo = useStudio((s) => s.history.future.length > 0);
  const { undo, redo, zoomBy, setZoom, toggleSnapping } = useStudio.getState();
  const { split, remove } = useTimelineActions();

  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-hairline px-2">
      <div className="flex items-center gap-0.5">
        <ToolButton label="Undo" disabled={!canUndo} onClick={undo}><Undo2 /></ToolButton>
        <ToolButton label="Redo" disabled={!canRedo} onClick={redo}><Redo2 /></ToolButton>
        <span className="mx-1 h-4 w-px bg-hairline" />
        <ToolButton label="Split at playhead (B)" onClick={split}><Scissors /></ToolButton>
        <ToolButton label="Delete (Backspace)" disabled={!selection} onClick={() => remove(false)}><Trash2 /></ToolButton>
        <span className="mx-1 h-4 w-px bg-hairline" />
        <ToolButton label="Snap to edges" active={snapping} onClick={toggleSnapping}><Magnet /></ToolButton>
      </div>
      <div className="flex items-center gap-1">
        <ToolButton label="Zoom out" onClick={() => zoomBy(1 / STUDIO_ZOOM.STEP)}><ZoomOut /></ToolButton>
        <input
          type="range"
          aria-label="Zoom"
          min={STUDIO_ZOOM.MIN}
          max={STUDIO_ZOOM.MAX}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-1 w-16 cursor-pointer accent-primary sm:w-24"
        />
        <ToolButton label="Zoom in" onClick={() => zoomBy(STUDIO_ZOOM.STEP)}><ZoomIn /></ToolButton>
      </div>
    </div>
  );
}
