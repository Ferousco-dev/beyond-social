"use client";

import { DEFAULT_FILTERS, type Filters, type VideoItem } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { EmptyHint, Field, Slider } from "./control";

/** One-click looks, each a preset over the same filter values. */
const LOOKS: ReadonlyArray<{ name: string; filters: Filters }> = [
  { name: "None", filters: DEFAULT_FILTERS },
  { name: "Warm", filters: { ...DEFAULT_FILTERS, temperature: 25, saturation: 1.1 } },
  { name: "Cool", filters: { ...DEFAULT_FILTERS, temperature: -25, saturation: 0.95 } },
  { name: "Punch", filters: { ...DEFAULT_FILTERS, contrast: 1.25, saturation: 1.3 } },
  { name: "Faded", filters: { ...DEFAULT_FILTERS, contrast: 0.85, saturation: 0.8 } },
  { name: "Mono", filters: { ...DEFAULT_FILTERS, saturation: 0, contrast: 1.1 } },
];

export function FiltersPanel({ item, editor }: { item: VideoItem | null; editor: EditorState }) {
  if (!item) return <EmptyHint>Select a clip on the timeline to grade it.</EmptyHint>;

  const set = (patch: Partial<Filters>, label?: string): void =>
    editor.update<VideoItem>(item.id, { filters: { ...item.filters, ...patch } }, label);

  return (
    <div className="space-y-5">
      <Field label="Looks">
        <div className="grid grid-cols-3 gap-1.5">
          {LOOKS.map((look) => (
            <button
              key={look.name}
              type="button"
              onClick={() => editor.update<VideoItem>(item.id, { filters: look.filters })}
              className="cursor-pointer rounded-md border border-hairline px-2 py-1.5 text-[11px] text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {look.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Adjust">
        <Slider
          label="Brightness"
          value={item.filters.brightness}
          min={0.4}
          max={1.6}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(brightness) => set({ brightness }, `brightness:${item.id}`)}
        />
        <Slider
          label="Contrast"
          value={item.filters.contrast}
          min={0.4}
          max={1.8}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(contrast) => set({ contrast }, `contrast:${item.id}`)}
        />
        <Slider
          label="Saturation"
          value={item.filters.saturation}
          min={0}
          max={2}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(saturation) => set({ saturation }, `saturation:${item.id}`)}
        />
        <Slider
          label="Temperature"
          value={item.filters.temperature}
          min={-50}
          max={50}
          onChange={(temperature) => set({ temperature }, `temperature:${item.id}`)}
        />
        <Slider
          label="Blur"
          value={item.filters.blur}
          min={0}
          max={10}
          step={0.5}
          format={(value) => `${value}px`}
          onChange={(blur) => set({ blur }, `blur:${item.id}`)}
        />
      </Field>
    </div>
  );
}
