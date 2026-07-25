"use client";

import { type VideoItem } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { EmptyHint, Field, Slider } from "./control";

const PRESETS = [0.25, 0.5, 1, 1.5, 2, 4] as const;

/**
 * Speed retimes the clip: changing the rate rescales its duration on the
 * timeline, which is what makes a slow-motion clip actually occupy more time.
 */
export function SpeedPanel({ item, editor }: { item: VideoItem | null; editor: EditorState }) {
  if (!item) return <EmptyHint>Select a clip on the timeline to retime it.</EmptyHint>;

  const setSpeed = (speed: number, label?: string): void => {
    const sourceMs = item.durationMs * item.speed;
    editor.update<VideoItem>(
      item.id,
      { speed, durationMs: Math.max(500, Math.round(sourceMs / speed)) },
      label,
    );
  };

  return (
    <div className="space-y-5">
      <Field label="Playback rate">
        <Slider
          label="Speed"
          value={item.speed}
          min={0.25}
          max={4}
          step={0.05}
          format={(value) => `${value.toFixed(2)}x`}
          onChange={(speed) => setSpeed(speed, `speed:${item.id}`)}
        />
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSpeed(preset)}
              aria-pressed={item.speed === preset}
              className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                item.speed === preset
                  ? "border-primary bg-primary/10 text-ink"
                  : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
              }`}
            >
              {preset}x
            </button>
          ))}
        </div>
      </Field>

      <Field label="Result">
        <p className="text-xs leading-relaxed text-ink-soft">
          This clip now runs{" "}
          <span className="tabular-nums text-ink">{(item.durationMs / 1000).toFixed(1)}s</span> on
          the timeline.
        </p>
      </Field>
    </div>
  );
}
