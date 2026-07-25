"use client";

import { Music } from "lucide-react";

import { MUSIC_LIBRARY } from "@/lib/editor/project";
import { isAudio, type AudioItem } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { Field } from "./control";

/** Swaps the bed on the audio track, keeping its level and fades. */
export function MusicPanel({ editor }: { editor: EditorState }) {
  const track = editor.project.tracks.find((candidate) => candidate.kind === "audio");
  const current = track?.items.find(isAudio) ?? null;

  return (
    <Field label="Music">
      <ul className="space-y-1.5">
        {MUSIC_LIBRARY.map((option) => {
          const active = current?.title === option.title;
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() =>
                  current &&
                  editor.update<AudioItem>(current.id, {
                    title: option.title,
                    durationMs: option.durationMs,
                  })
                }
                aria-pressed={active}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active ? "border-primary bg-primary/10" : "border-hairline hover:bg-cloud"
                }`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded bg-cloud text-ink-soft">
                  <Music className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink">{option.title}</span>
                  <span className="block text-[11px] tabular-nums text-ink-soft">
                    {(option.durationMs / 1000).toFixed(0)}s
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
