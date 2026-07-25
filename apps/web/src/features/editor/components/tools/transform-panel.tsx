"use client";

import { RotateCcw } from "lucide-react";

import { DEFAULT_TRANSFORM, TRANSITIONS, type VideoItem } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { Choices, EmptyHint, Field, Slider } from "./control";

/** Position, scale, rotation, opacity, and the clip's incoming transition. */
export function TransformPanel({ item, editor }: { item: VideoItem | null; editor: EditorState }) {
  if (!item) return <EmptyHint>Select a clip on the timeline to adjust it.</EmptyHint>;

  const set = (patch: Partial<VideoItem>, label?: string): void =>
    editor.update<VideoItem>(item.id, patch, label);

  const setTransform = (patch: Partial<VideoItem["transform"]>, label: string): void =>
    set({ transform: { ...item.transform, ...patch } }, label);

  return (
    <div className="space-y-5">
      <Field label="Position and scale">
        <Slider
          label="Scale"
          value={item.transform.scale}
          min={0.2}
          max={3}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(scale) => setTransform({ scale }, `scale:${item.id}`)}
        />
        <Slider
          label="Horizontal"
          value={item.transform.x}
          min={-50}
          max={50}
          format={(value) => `${value}%`}
          onChange={(x) => setTransform({ x }, `x:${item.id}`)}
        />
        <Slider
          label="Vertical"
          value={item.transform.y}
          min={-50}
          max={50}
          format={(value) => `${value}%`}
          onChange={(y) => setTransform({ y }, `y:${item.id}`)}
        />
        <Slider
          label="Rotation"
          value={item.transform.rotation}
          min={-180}
          max={180}
          format={(value) => `${value}deg`}
          onChange={(rotation) => setTransform({ rotation }, `rotate:${item.id}`)}
        />

        <button
          type="button"
          onClick={() => set({ transform: DEFAULT_TRANSFORM })}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-[11px] text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCcw className="size-3" />
          Reset transform
        </button>
      </Field>

      <Field label="Opacity">
        <Slider
          label="Opacity"
          value={item.opacity}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(opacity) => set({ opacity }, `opacity:${item.id}`)}
        />
      </Field>

      <Field label="Transition in">
        <Choices
          options={TRANSITIONS}
          value={item.transitionIn}
          onChange={(transitionIn) => set({ transitionIn })}
        />
        {item.transitionIn !== "none" ? (
          <Slider
            label="Duration"
            value={item.transitionMs}
            min={200}
            max={2000}
            step={100}
            format={(value) => `${(value / 1000).toFixed(1)}s`}
            onChange={(transitionMs) => set({ transitionMs }, `transition:${item.id}`)}
          />
        ) : null}
      </Field>
    </div>
  );
}
