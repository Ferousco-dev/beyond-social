"use client";

import { Copy, Redo2, SplitSquareHorizontal, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";

/** Pixels per second of timeline, from a whole-project overview to frame work. */
export const ZOOM_LEVELS = [12, 20, 32, 52, 84, 136] as const;
export const DEFAULT_ZOOM_INDEX = 2;

function ToolButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ZoomIn;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  );
}

export function TimelineToolbar({
  zoomIndex,
  onZoomChange,
  onSplit,
  onDelete,
  onDuplicate,
  onUndo,
  onRedo,
  canSplit,
  canDelete,
  canDuplicate,
  canUndo,
  canRedo,
}: {
  zoomIndex: number;
  onZoomChange: (index: number) => void;
  onSplit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canSplit: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-hairline px-2 py-1.5">
      <ToolButton label="Undo" icon={Undo2} onClick={onUndo} disabled={!canUndo} />
      <ToolButton label="Redo" icon={Redo2} onClick={onRedo} disabled={!canRedo} />
      <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />
      <ToolButton
        label="Split at playhead"
        icon={SplitSquareHorizontal}
        onClick={onSplit}
        disabled={!canSplit}
      />
      <ToolButton label="Duplicate" icon={Copy} onClick={onDuplicate} disabled={!canDuplicate} />
      <ToolButton label="Delete" icon={Trash2} onClick={onDelete} disabled={!canDelete} />

      <div className="ml-auto flex items-center gap-1">
        <ToolButton
          label="Zoom out"
          icon={ZoomOut}
          onClick={() => onZoomChange(zoomIndex - 1)}
          disabled={zoomIndex <= 0}
        />
        <input
          type="range"
          min={0}
          max={ZOOM_LEVELS.length - 1}
          value={zoomIndex}
          aria-label="Timeline zoom"
          onChange={(event) => onZoomChange(Number(event.target.value))}
          className={cn("w-24 accent-primary")}
        />
        <ToolButton
          label="Zoom in"
          icon={ZoomIn}
          onClick={() => onZoomChange(zoomIndex + 1)}
          disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
        />
      </div>
    </div>
  );
}
