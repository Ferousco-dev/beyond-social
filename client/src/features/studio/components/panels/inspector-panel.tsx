"use client";

import { SlidersHorizontal } from "lucide-react";

import { locate } from "../../core/find.ts";
import { updateItem } from "../../core/ops.ts";
import { type Item } from "../../core/types.ts";
import { formatTimecode } from "../../lib/format";
import { selectProject, useStudio } from "../../store/editor-store";
import { Field, INPUT } from "./field";

function change(id: string, patch: Record<string, unknown>): void {
  useStudio.getState().edit((p) => updateItem(p, id, patch), `${id}:${Object.keys(patch).join(",")}`);
}

function Fields({ item }: { item: Item }) {
  switch (item.kind) {
    case "caption":
      return (
        <>
          <Field label="Text">
            <textarea
              value={item.text}
              maxLength={500}
              rows={3}
              onChange={(e) => change(item.id, { text: e.target.value })}
              className={`${INPUT} h-auto py-2`}
            />
          </Field>
          <Field label="Colour" value={item.style.color}>
            <input type="color" aria-label="Caption colour" value={item.style.color} onChange={(e) => change(item.id, { style: { ...item.style, color: e.target.value } })} className="h-9 w-full cursor-pointer rounded-lg border border-hairline bg-canvas p-1" />
          </Field>
          <Field label="Size" value={String(item.style.size)}>
            <input type="range" min={24} max={160} value={item.style.size} onChange={(e) => change(item.id, { style: { ...item.style, size: Number(e.target.value) } })} className="w-full accent-primary" />
          </Field>
          <Field label="Position" value={`${Math.round(item.style.y * 100)}%`}>
            <input type="range" min={5} max={95} value={Math.round(item.style.y * 100)} onChange={(e) => change(item.id, { style: { ...item.style, y: Number(e.target.value) / 100 } })} className="w-full accent-primary" />
          </Field>
        </>
      );
    case "image":
      return (
        <Field label="Size" value={`${Math.round(item.scale * 100)}%`}>
          <input type="range" min={5} max={200} value={Math.round(item.scale * 100)} onChange={(e) => change(item.id, { scale: Number(e.target.value) / 100 })} className="w-full accent-primary" />
        </Field>
      );
    default:
      return (
        <Field label="Volume" value={`${Math.round(item.volume * 100)}%`}>
          <input type="range" min={0} max={200} value={Math.round(item.volume * 100)} onChange={(e) => change(item.id, { volume: Number(e.target.value) / 100 })} className="w-full accent-primary" />
        </Field>
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
    <div className="space-y-4 p-3">
      <p className="font-mono text-xs text-ink-soft">
        {formatTimecode(item.start)} · {item.duration.toFixed(1)}s
      </p>
      <Fields item={item} />
    </div>
  );
}
