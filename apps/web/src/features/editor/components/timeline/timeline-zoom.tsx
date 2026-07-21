"use client";

import { ZoomIn, ZoomOut } from "lucide-react";

/** Pixels per second of timeline, from a whole-project overview to frame work. */
export const ZOOM_LEVELS = [12, 20, 32, 52, 84, 136] as const;
export const DEFAULT_ZOOM_INDEX = 2;

export function TimelineZoom({
  index,
  onChange,
}: {
  index: number;
  onChange: (index: number) => void;
}) {
  const controls = [
    { key: "out", label: "Zoom out", icon: ZoomOut, next: index - 1, disabled: index <= 0 },
    {
      key: "in",
      label: "Zoom in",
      icon: ZoomIn,
      next: index + 1,
      disabled: index >= ZOOM_LEVELS.length - 1,
    },
  ] as const;

  return (
    <div className="flex items-center gap-1">
      {controls.map((control) => (
        <button
          key={control.key}
          type="button"
          aria-label={control.label}
          disabled={control.disabled}
          onClick={() => onChange(control.next)}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <control.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
