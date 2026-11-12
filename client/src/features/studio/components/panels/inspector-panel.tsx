"use client";

import { Maximize2, MoveHorizontal, MoveVertical, Palette, SlidersHorizontal, Type, Volume2 } from "lucide-react";

import { locate } from "../../core/find.ts";
import { setSpeed, updateItem } from "../../core/ops.ts";
import { type Item } from "../../core/types.ts";
import { formatTimecode } from "../../lib/format";
import { selectProject, useStudio } from "../../store/editor-store";
import { AnimationFields } from "./animation-fields";
import { INPUT } from "./field";
import { Section, SliderRow } from "./slider-row";
import { SpeedField } from "./speed-field";

function change(id: string, patch: Record<string, unknown>): void {
  useStudio.getState().edit((p) => updateItem(p, id, patch), `${id}:${Object.keys(patch).join(",")}`);
}

function Fields({ item }: { item: Item }) {
  switch (item.kind) {
    case "caption":
    case "text":
      return (
        <>
          <Section title="Text">
            <textarea
              value={item.text}
              maxLength={500}
              rows={3}
              aria-label="Text"
              onChange={(e) => change(item.id, { text: e.target.value })}
              className={`${INPUT} h-auto py-2`}
            />
            <label className="flex items-center gap-3" title="Colour">
              <Palette className="size-4 shrink-0 text-ink-soft" aria-hidden />
              <input type="color" aria-label="Caption colour" value={item.style.color} onChange={(e) => change(item.id, { style: { ...item.style, color: e.target.value } })} className="h-8 min-w-0 flex-1 cursor-pointer rounded-md border border-hairline bg-canvas p-0.5" />
              <span className="flex h-8 w-[4.5rem] shrink-0 items-center justify-end rounded-md bg-cloud px-2 font-mono text-xs uppercase text-ink">{item.style.color}</span>
            </label>
          </Section>
          <Section title="Layout">
            <SliderRow label="Size" Icon={Type} min={24} max={160} value={item.style.size} onChange={(v) => change(item.id, { style: { ...item.style, size: v } })} />
            <SliderRow label="Across" Icon={MoveHorizontal} unit="%" min={5} max={95} value={Math.round((item.style.x ?? 0.5) * 100)} onChange={(v) => change(item.id, { style: { ...item.style, x: v / 100 } })} />
            <SliderRow label="Down" Icon={MoveVertical} unit="%" min={5} max={95} value={Math.round(item.style.y * 100)} onChange={(v) => change(item.id, { style: { ...item.style, y: v / 100 } })} />
          </Section>
        </>
      );
    case "image":
      return (
        <Section title="Basic">
          <SliderRow label="Size" Icon={Maximize2} unit="%" min={5} max={200} value={Math.round(item.scale * 100)} onChange={(v) => change(item.id, { scale: v / 100 })} />
        </Section>
      );
    default:
      if (item.kind !== "video" && item.kind !== "audio") return null;
      return (
        <>
          <Section title="Basic" onReset={() => change(item.id, { volume: 1 })}>
            <SliderRow label="Volume" Icon={Volume2} unit="%" min={0} max={100} value={Math.round(Math.min(1, item.volume) * 100)} onChange={(v) => change(item.id, { volume: v / 100 })} />
          </Section>
          <Section title="Speed" onReset={() => useStudio.getState().edit((p) => setSpeed(p, item.id, 1))}>
            <SpeedField item={item} />
          </Section>
        </>
      );
  }
}

export function InspectorPanel() {
  const project = useStudio(selectProject);
  const selection = useStudio((s) => s.selection);
  const item = selection ? locate(project, selection)?.item : undefined;

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <SlidersHorizontal className="size-8 text-ink-soft" strokeWidth={1} aria-hidden />
        <p className="text-sm font-medium text-ink">Nothing selected</p>
        <p className="text-xs text-ink-soft">Pick something on the timeline to edit it.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      <p className="font-mono text-xs text-ink-soft">
        {formatTimecode(item.start)} · {item.duration.toFixed(1)}s
      </p>
      <Fields item={item} />
      {item.kind === "video" || item.kind === "image" || item.kind === "text" ? <AnimationFields item={item} /> : null}
    </div>
  );
}
