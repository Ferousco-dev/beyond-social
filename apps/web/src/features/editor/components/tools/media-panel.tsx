"use client";

import { Film, Plus } from "lucide-react";

import { MEDIA_LIBRARY } from "@/lib/editor/project";
import {
  DEFAULT_FILTERS,
  DEFAULT_TRANSFORM,
  projectDurationMs,
  type VideoItem,
} from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { Field } from "./control";

/** Stock shots that can be appended to the video track. */
export function MediaPanel({
  editor,
  playback,
}: {
  editor: EditorState;
  playback: { seek: (ms: number) => void };
}) {
  const track = editor.project.tracks.find((candidate) => candidate.kind === "video");

  const add = (label: string, durationMs: number): void => {
    if (!track) return;
    // Appended to the end of the track, which is where a magnetic track expects
    // new footage; the user can then drag it into place.
    const startMs = track.items.reduce(
      (end, item) => Math.max(end, item.startMs + item.durationMs),
      0,
    );
    const item: VideoItem = {
      id: `clip-${Date.now()}`,
      kind: "video",
      label,
      startMs,
      durationMs,
      speed: 1,
      volume: 0.8,
      opacity: 1,
      transform: DEFAULT_TRANSFORM,
      filters: DEFAULT_FILTERS,
      transitionIn: "none",
      transitionMs: 400,
    };
    editor.addItem(track.id, item);
    playback.seek(startMs);
  };

  return (
    <div className="space-y-5">
      <Field label="Library">
        <ul className="space-y-1.5">
          {MEDIA_LIBRARY.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => add(asset.label, asset.durationMs)}
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-hairline p-2 text-left transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded bg-cloud text-ink-soft">
                  <Film className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink">{asset.label}</span>
                  <span className="block text-[11px] tabular-nums text-ink-soft">
                    {(asset.durationMs / 1000).toFixed(1)}s
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-ink-soft transition-colors group-hover:text-ink" />
              </button>
            </li>
          ))}
        </ul>
      </Field>

      <Field label="Project">
        <p className="text-xs leading-relaxed text-ink-soft">
          {editor.project.tracks.reduce((count, item) => count + item.items.length, 0)} items across{" "}
          {editor.project.tracks.length} tracks, running{" "}
          <span className="tabular-nums text-ink">
            {(projectDurationMs(editor.project) / 1000).toFixed(1)}s
          </span>
          .
        </p>
      </Field>
    </div>
  );
}
