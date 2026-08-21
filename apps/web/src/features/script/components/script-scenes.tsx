"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo } from "react";

import { HookScoreBadge } from "@/components/ui/hook-score-badge";
import { computeDivergence, type ScriptBaseline } from "@/lib/script/divergence";
import { MAX_TOTAL_SECONDS, totalSeconds, type ScriptScene } from "@/lib/script/schema";

import { ScriptDivergenceWarning } from "./script-divergence-warning";

/**
 * The script itself, scene by scene, every line editable.
 *
 * The spoken line gets its own field and its own weight, because it is the one
 * thing that decides whether a video reads as a person talking or as stock
 * footage with a voice over it. The rest is direction.
 *
 * Seconds are a stepper rather than a free number: they are what becomes the
 * shot list, and the renderer has its own floor and ceiling for a beat.
 */

const MIN_SECONDS = 1;
const MAX_SECONDS = 12;

export function ScriptScenes({
  scenes,
  baseline,
  onChange,
}: {
  scenes: readonly ScriptScene[];
  /** The scene structure as first written; null while nothing has loaded yet. */
  baseline: ScriptBaseline | null;
  onChange: (index: number, patch: Partial<ScriptScene>) => void;
}) {
  const total = totalSeconds(scenes);
  const divergence = useMemo(
    () => (baseline ? computeDivergence(baseline, scenes) : null),
    [baseline, scenes],
  );
  let at = 0;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">The script</h3>
        <p className="text-xs tabular-nums text-ink-soft">
          {total}s
          {total > MAX_TOTAL_SECONDS
            ? ` (longer than the ${MAX_TOTAL_SECONDS}s one render makes)`
            : ""}
        </p>
      </div>

      {divergence ? <ScriptDivergenceWarning warning={divergence} /> : null}

      <ol className="mt-2.5 space-y-2.5">
        {scenes.map((scene, index) => {
          const from = at;
          at += scene.seconds;

          return (
            <li key={index} className="rounded-xl border border-hairline bg-canvas p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  {scene.purpose}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] tabular-nums text-ink-soft">
                    {from}s to {from + scene.seconds}s
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(index, { seconds: Math.max(MIN_SECONDS, scene.seconds - 1) })
                    }
                    disabled={scene.seconds <= MIN_SECONDS}
                    aria-label={`Shorten scene ${index + 1}`}
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded bg-paper text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus className="size-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(index, { seconds: Math.min(MAX_SECONDS, scene.seconds + 1) })
                    }
                    disabled={scene.seconds >= MAX_SECONDS}
                    aria-label={`Lengthen scene ${index + 1}`}
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded bg-paper text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus className="size-3" aria-hidden />
                  </button>
                </div>
              </div>

              <SceneField
                label="Says"
                value={scene.voiceover}
                rows={2}
                max={300}
                placeholder="The line, word for word"
                onChange={(value) => onChange(index, { voiceover: value })}
              />
              {/* Only the opening scene: this is a floor on the hook, and the
                  other scenes are not trying to be one. */}
              {index === 0 ? <HookScoreBadge text={scene.voiceover} /> : null}
              <SceneField
                label="On screen"
                value={scene.visual}
                rows={2}
                max={400}
                placeholder="Who is there, where, doing what"
                onChange={(value) => onChange(index, { visual: value })}
              />
              <SceneField
                label="Caption"
                value={scene.onScreenText}
                rows={1}
                max={80}
                placeholder="Text burned over the picture"
                onChange={(value) => onChange(index, { onScreenText: value })}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SceneField({
  label,
  value,
  rows,
  max,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  max: number;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-2 block">
      <span className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-none rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-soft/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      />
    </label>
  );
}
