"use client";

import { Minus, Plus, Scissors, X } from "lucide-react";
import { useCallback } from "react";

export interface PendingShot {
  readonly prompt: string;
  readonly duration: number;
}

const MIN_DURATION = 1;
const MAX_DURATION = 12;
const MAX_SHOTS = 5;

interface ShotListEditorProps {
  readonly shots: readonly PendingShot[];
  readonly onChange: (shots: readonly PendingShot[]) => void;
  readonly onRemoveAll: () => void;
}

export function ShotListEditor({ shots, onChange, onRemoveAll }: ShotListEditorProps) {
  const addShot = useCallback(() => {
    if (shots.length >= MAX_SHOTS) return;
    onChange([...shots, { prompt: "", duration: 5 }]);
  }, [shots, onChange]);

  const updateShot = useCallback(
    (index: number, patch: Partial<PendingShot>) => {
      onChange(shots.map((shot, i) => (i === index ? { ...shot, ...patch } : shot)));
    },
    [shots, onChange],
  );

  const removeShot = useCallback(
    (index: number) => {
      const next = shots.filter((_, i) => i !== index);
      if (next.length === 0) {
        onRemoveAll();
        return;
      }
      onChange(next);
    },
    [shots, onChange, onRemoveAll],
  );

  return (
    <div className="space-y-2 px-1 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <Scissors className="size-3.5" aria-hidden />
          <span>Shots ({shots.length}/{MAX_SHOTS})</span>
        </div>
        <button
          type="button"
          onClick={onRemoveAll}
          aria-label="Remove all shots"
          className="text-xs text-ink-soft transition-colors hover:text-ink"
        >
          Clear
        </button>
      </div>

      {shots.map((shot, index) => (
        <div key={index} className="flex items-start gap-2 rounded-xl bg-canvas p-2.5">
          <span className="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-semibold text-ink-soft">
            {index + 1}
          </span>
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={shot.prompt}
              onChange={(e) => updateShot(index, { prompt: e.target.value })}
              placeholder={`What happens in shot ${index + 1}`}
              maxLength={500}
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateShot(index, { duration: Math.max(MIN_DURATION, shot.duration - 1) })
                }
                disabled={shot.duration <= MIN_DURATION}
                aria-label="Decrease duration"
                className="inline-flex size-5 items-center justify-center rounded bg-paper text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
              >
                <Minus className="size-3" aria-hidden />
              </button>
              <span className="min-w-[2.5rem] text-center text-xs tabular-nums text-ink-soft">
                {shot.duration}s
              </span>
              <button
                type="button"
                onClick={() =>
                  updateShot(index, { duration: Math.min(MAX_DURATION, shot.duration + 1) })
                }
                disabled={shot.duration >= MAX_DURATION}
                aria-label="Increase duration"
                className="inline-flex size-5 items-center justify-center rounded bg-paper text-ink-soft transition-colors hover:text-ink disabled:opacity-30"
              >
                <Plus className="size-3" aria-hidden />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeShot(index)}
            aria-label={`Remove shot ${index + 1}`}
            className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      ))}

      {shots.length < MAX_SHOTS ? (
        <button
          type="button"
          onClick={addShot}
          className="w-full rounded-xl border border-dashed border-hairline px-3 py-2 text-xs text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
        >
          + Add shot
        </button>
      ) : null}
    </div>
  );
}
