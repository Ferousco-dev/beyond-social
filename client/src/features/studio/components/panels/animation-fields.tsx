"use client";

import { Diamond, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { animatedAt } from "../../core/animate.ts";
import { removeKeyframe, setKeyframe, setTransition } from "../../core/ops.ts";
import { TRANSITIONS, type Item, type TransitionType } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";
import { Field } from "./field";

type Animatable = Extract<Item, { kind: "video" | "image" | "text" }>;

const ENTRANCE_LABEL: Record<TransitionType, string> = { fade: "Fade", slide: "Slide", zoom: "Zoom", wipe: "Wipe" };

/** Where an item sits when nothing has been keyframed. */
function base(item: Animatable): { x: number; y: number } {
  if (item.kind === "image") return { x: item.x, y: item.y };
  if (item.kind === "text") return { x: item.style.x ?? 0.5, y: item.style.y };
  return { x: 0.5, y: 0.5 };
}

const CHOICE = "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary";

export function AnimationFields({ item }: { item: Animatable }) {
  const currentTime = useStudio((s) => s.currentTime);
  const local = currentTime - item.start;
  const inside = local >= 0 && local <= item.duration;
  const now = animatedAt(item, Math.min(Math.max(local, 0), item.duration));
  const origin = base(item);
  const values = { x: now.x ?? origin.x, y: now.y ?? origin.y, scale: now.scale, opacity: now.opacity };
  const keyframes = item.keyframes ?? [];

  /** Changing a value while the playhead is over the item pins it at that moment. */
  const pin = (patch: Partial<typeof values>): void => {
    if (!inside) return void useStudio.getState().setNotice("Move the playhead over this item to animate it.");
    useStudio.getState().edit((p) => setKeyframe(p, item.id, { t: local, ...values, ...patch }), `kf:${item.id}:${Object.keys(patch).join(",")}`);
  };

  return (
    <div className="space-y-4 border-t border-hairline pt-4">
      <Field label="Entrance">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={!item.transition} onClick={() => useStudio.getState().edit((p) => setTransition(p, item.id, null))} className={cn(CHOICE, !item.transition ? "border-primary text-ink" : "border-hairline text-ink-soft")}>
            None
          </button>
          {TRANSITIONS.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={item.transition?.type === type}
              onClick={() => useStudio.getState().edit((p) => setTransition(p, item.id, { type, duration: item.transition?.duration ?? 0.6 }))}
              className={cn(CHOICE, item.transition?.type === type ? "border-primary text-ink" : "border-hairline text-ink-soft hover:text-ink")}
            >
              {ENTRANCE_LABEL[type]}
            </button>
          ))}
        </div>
      </Field>
      {item.transition ? (
        <Field label="Entrance length" value={`${item.transition.duration.toFixed(1)}s`}>
          <input
            type="range"
            min={1}
            max={30}
            value={Math.round(item.transition.duration * 10)}
            onChange={(e) => {
              const type = item.transition?.type ?? "fade";
              useStudio.getState().edit((p) => setTransition(p, item.id, { type, duration: Number(e.target.value) / 10 }), `entrance:${item.id}`);
            }}
            className="w-full accent-primary"
          />
        </Field>
      ) : null}

      <Field label="Animate at the playhead" value={keyframes.length > 0 ? `${keyframes.length} pinned` : undefined}>
        <div className="space-y-3">
          {([["Size", "scale", 5, 400, 100], ["Opacity", "opacity", 0, 100, 100], ["Across", "x", 0, 100, 100], ["Down", "y", 0, 100, 100]] as const).map(([label, key, min, max, factor]) => (
            <label key={key} className="block">
              <span className="mb-1 flex justify-between text-xs text-ink-soft">
                {label}
                <span className="font-mono">{Math.round(values[key] * factor)}%</span>
              </span>
              <input type="range" min={min} max={max} value={Math.round(values[key] * factor)} disabled={!inside} onChange={(e) => pin({ [key]: Number(e.target.value) / factor })} className="w-full accent-primary disabled:opacity-40" />
            </label>
          ))}
        </div>
      </Field>

      {keyframes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Pinned moments">
          {keyframes.map((k) => (
            <li key={k.t} className="inline-flex items-center rounded-full border border-hairline text-xs text-ink-soft">
              <button type="button" onClick={() => useStudio.getState().seek(item.start + k.t)} className="inline-flex cursor-pointer items-center gap-1 rounded-l-full py-1 pl-2 pr-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                <Diamond className="size-3 text-primary" aria-hidden />
                {k.t.toFixed(1)}s
              </button>
              <button type="button" aria-label={`Remove the keyframe at ${k.t.toFixed(1)} seconds`} onClick={() => useStudio.getState().edit((p) => removeKeyframe(p, item.id, k.t))} className="inline-flex cursor-pointer rounded-r-full py-1 pl-1 pr-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-soft">Move the playhead, change a value above, and it is pinned there. Pin two moments and it glides between them.</p>
      )}
    </div>
  );
}
