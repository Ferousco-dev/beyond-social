"use client";

import { type AudioItem } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { EmptyHint, Field, Slider } from "./control";

/** Level and fades for the selected audio item. */
export function AudioPanel({ item, editor }: { item: AudioItem | null; editor: EditorState }) {
  if (!item) return <EmptyHint>Select an audio clip on the timeline to mix it.</EmptyHint>;

  const set = (patch: Partial<AudioItem>, label?: string): void =>
    editor.update<AudioItem>(item.id, patch, label);

  return (
    <div className="space-y-5">
      <Field label={item.title}>
        <Slider
          label="Volume"
          value={item.volume}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(volume) => set({ volume }, `volume:${item.id}`)}
        />
      </Field>

      <Field label="Fades">
        <Slider
          label="Fade in"
          value={item.fadeInMs}
          min={0}
          max={4000}
          step={100}
          format={(value) => `${(value / 1000).toFixed(1)}s`}
          onChange={(fadeInMs) => set({ fadeInMs }, `fadein:${item.id}`)}
        />
        <Slider
          label="Fade out"
          value={item.fadeOutMs}
          min={0}
          max={4000}
          step={100}
          format={(value) => `${(value / 1000).toFixed(1)}s`}
          onChange={(fadeOutMs) => set({ fadeOutMs }, `fadeout:${item.id}`)}
        />
      </Field>
    </div>
  );
}
