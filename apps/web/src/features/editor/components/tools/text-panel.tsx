"use client";

import { Plus } from "lucide-react";

import {
  DEFAULT_TEXT_STYLE,
  TEXT_ANIMATIONS,
  isText,
  type TextItem,
  type TextStyle,
} from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { type Playback } from "../../hooks/use-playback";
import { Choices, Field, Slider } from "./control";

const COLORS = ["#ffffff", "#0b0b0e", "#3b82f6", "#f59e0b", "#22c55e", "#f04438"] as const;
const DEFAULT_TEXT_MS = 4_000;

/** Caption list plus the styling controls for the selected caption. */
export function TextPanel({ editor, playback }: { editor: EditorState; playback: Playback }) {
  const track = editor.project.tracks.find((candidate) => candidate.kind === "text");
  const items = (track?.items ?? []).filter(isText);
  const selected = editor.selected && isText(editor.selected) ? editor.selected : null;

  const setStyle = (patch: Partial<TextStyle>, label?: string): void => {
    if (!selected) return;
    editor.update<TextItem>(selected.id, { style: { ...selected.style, ...patch } }, label);
  };

  const addCaption = (): void => {
    if (!track) return;
    editor.addItem(track.id, {
      id: `text-${Date.now()}`,
      kind: "text",
      text: "New caption",
      startMs: Math.round(playback.currentMs),
      durationMs: DEFAULT_TEXT_MS,
      style: DEFAULT_TEXT_STYLE,
    });
  };

  return (
    <div className="space-y-5">
      <Field label="Captions">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  editor.select(item.id);
                  playback.seek(item.startMs);
                }}
                aria-pressed={selected?.id === item.id}
                className={`w-full cursor-pointer truncate rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selected?.id === item.id
                    ? "border-primary bg-primary/10 text-ink"
                    : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
                }`}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addCaption}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-[11px] text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="size-3" />
          Add caption at playhead
        </button>
      </Field>

      {selected ? (
        <>
          <Field label="Content">
            <textarea
              value={selected.text}
              onChange={(event) =>
                editor.update<TextItem>(
                  selected.id,
                  { text: event.target.value },
                  `text:${selected.id}`,
                )
              }
              rows={2}
              aria-label="Caption text"
              className="w-full resize-none rounded-md border border-hairline bg-canvas px-2 py-1.5 text-xs text-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </Field>

          <Field label="Style">
            <Slider
              label="Size"
              value={selected.style.fontSize}
              min={16}
              max={72}
              format={(value) => `${value}px`}
              onChange={(fontSize) => setStyle({ fontSize }, `size:${selected.id}`)}
            />

            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setStyle({ color })}
                  aria-label={`Colour ${color}`}
                  aria-pressed={selected.style.color === color}
                  style={{ backgroundColor: color }}
                  className={`size-6 cursor-pointer rounded-full border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected.style.color === color ? "border-primary" : "border-hairline"
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["bold", "Bold"],
                  ["italic", "Italic"],
                  ["uppercase", "Caps"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStyle({ [key]: !selected.style[key] })}
                  aria-pressed={selected.style[key]}
                  className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected.style[key]
                      ? "border-primary bg-primary/10 text-ink"
                      : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Alignment">
            <Choices
              options={["left", "center", "right"] as const}
              value={selected.style.align}
              onChange={(align) => setStyle({ align })}
            />
          </Field>

          <Field label="Animation">
            <Choices
              options={TEXT_ANIMATIONS}
              value={selected.style.animation}
              onChange={(animation) => setStyle({ animation })}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}
