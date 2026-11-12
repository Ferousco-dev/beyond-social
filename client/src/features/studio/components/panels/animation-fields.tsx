"use client";

import { Ban, Blend, ChevronDown, Diamond, Maximize2, MoveHorizontal, MoveRight, MoveVertical, Timer, X, ZoomIn, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { animatedAt } from "../../core/animate.ts";
import { removeKeyframe, setKeyframe, setTransition } from "../../core/ops.ts";
import { TRANSITIONS, type Item, type TransitionType } from "../../core/types.ts";
import { useStudio } from "../../store/editor-store";
import { Section, SliderRow } from "./slider-row";

type Animatable = Extract<Item, { kind: "video" | "image" | "text" }>;

const ENTRANCE: Record<TransitionType, { label: string; Icon: LucideIcon }> = {
  fade: { label: "Fade", Icon: Blend },
  slide: { label: "Slide", Icon: MoveRight },
  zoom: { label: "Zoom", Icon: ZoomIn },
  wipe: { label: "Wipe", Icon: PanelLeftOpen },
};

/** Where an item sits when nothing has been keyframed. */
function base(item: Animatable): { x: number; y: number } {
  if (item.kind === "image") return { x: item.x, y: item.y };
  if (item.kind === "text") return { x: item.style.x ?? 0.5, y: item.style.y };
  return { x: 0.5, y: 0.5 };
}

const CHOICE = "inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-primary [&_svg]:size-4";

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

  const [open, setOpen] = useState(keyframes.length > 0);

  const clearAnimation = (): void => {
    void useStudio.getState().edit((p) => {
      let result = { ok: true as const, value: p } as ReturnType<typeof removeKeyframe>;
      for (const k of keyframes) {
        if (!result.ok) break;
        result = removeKeyframe(result.value, item.id, k.t);
      }
      return result;
    });
  };

  return (
    <>
      <Section title="Entrance" onReset={() => useStudio.getState().edit((p) => setTransition(p, item.id, null))}>
      <div className="flex gap-1" role="group" aria-label="Entrance">
        <button type="button" title="No entrance" aria-label="No entrance" aria-pressed={!item.transition} onClick={() => useStudio.getState().edit((p) => setTransition(p, item.id, null))} className={cn(CHOICE, !item.transition ? "border-primary bg-primary/10 text-ink" : "border-hairline text-ink-soft hover:text-ink")}>
          <Ban aria-hidden />
        </button>
        {TRANSITIONS.map((type) => {
          const { label, Icon } = ENTRANCE[type];
          return (
            <button
              key={type}
              type="button"
              title={`${label} in`}
              aria-label={`${label} in`}
              aria-pressed={item.transition?.type === type}
              onClick={() => useStudio.getState().edit((p) => setTransition(p, item.id, { type, duration: item.transition?.duration ?? 0.6 }))}
              className={cn(CHOICE, item.transition?.type === type ? "border-primary bg-primary/10 text-ink" : "border-hairline text-ink-soft hover:text-ink")}
            >
              <Icon aria-hidden />
            </button>
          );
        })}
      </div>
      {item.transition ? (
        <SliderRow
          label="Entrance length"
          Icon={Timer}
          unit="s"
          min={0.1}
          max={3}
          step={0.1}
          value={Number(item.transition.duration.toFixed(1))}
          onChange={(v) => {
            const type = item.transition?.type ?? "fade";
            useStudio.getState().edit((p) => setTransition(p, item.id, { type, duration: Math.min(3, Math.max(0.1, v)) }), `entrance:${item.id}`);
          }}
        />
      ) : null}
      </Section>

      <Section title="Animation" onReset={keyframes.length > 0 ? clearAnimation : undefined}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md py-1 text-xs text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Diamond className="size-4 text-primary" aria-hidden />
        <span className="flex-1 text-left">Animate at the playhead</span>
        {keyframes.length > 0 ? <span className="font-mono">{keyframes.length} pinned</span> : null}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-2.5">
          {([["Size", Maximize2, "scale", 5, 400, 100], ["Opacity", Blend, "opacity", 0, 100, 100], ["Across", MoveHorizontal, "x", 0, 100, 100], ["Down", MoveVertical, "y", 0, 100, 100]] as const).map(([label, Icon, key, min, max, factor]) => (
            <SliderRow key={key} label={label} Icon={Icon} unit="%" min={min} max={max} value={Math.round(values[key] * factor)} disabled={!inside} onChange={(v) => pin({ [key]: v / factor })} />
          ))}

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
            <p className="text-xs text-ink-soft">Move the playhead and change a value: it is pinned there. Pin two moments and it glides between them.</p>
          )}
        </div>
      ) : null}
      </Section>
    </>
  );
}
