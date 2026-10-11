"use client";

import { projectDurationMs } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { Field } from "./control";

/**
 * What is actually on the timeline.
 *
 * This used to offer four stock shots: Product macro, Lifestyle wide, Hands
 * detail, Logo sting. No video existed behind any of them. Adding one appended a
 * clip with no source, which the preview draws as a labelled grey rectangle and
 * the export drops entirely, so the timeline gained an item that could never
 * become footage.
 *
 * Every clip here comes from a render, which is the only place footage actually
 * comes from. When there is a real stock library with real files, this is where
 * it goes.
 */
export function MediaPanel({ editor }: { editor: EditorState }) {
  const items = editor.project.tracks.reduce((count, track) => count + track.items.length, 0);

  return (
    <div className="space-y-5">
      <Field label="Project">
        <p className="text-xs leading-relaxed text-ink-soft">
          {items} {items === 1 ? "item" : "items"} across {editor.project.tracks.length} tracks,
          running{" "}
          <span className="tabular-nums text-ink">
            {(projectDurationMs(editor.project) / 1000).toFixed(1)}s
          </span>
          .
        </p>
      </Field>

      <Field label="Adding footage">
        <p className="text-xs leading-relaxed text-ink-soft">
          Clips come from the videos you generate in the chat. Make one there and it lands on this
          timeline ready to cut.
        </p>
      </Field>
    </div>
  );
}
