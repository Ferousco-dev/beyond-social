"use client";

import { Music } from "lucide-react";

import { isAudio } from "@/lib/editor/types";

import { type EditorState } from "../../hooks/use-editor-state";
import { Field } from "./control";

/**
 * The audio track, and what it can honestly do today.
 *
 * This offered four tracks called Sunrise Run, Momentum, Golden Hour and City
 * Lights. None of them existed. There were no audio files behind the names, the
 * preview has no audio element to play one through, and the export joins video
 * only, so choosing a track renamed a silent bar on the timeline and changed
 * nothing else. It looked like a music library and was a list of four strings.
 *
 * So it says what is true instead. A panel that admits it cannot do something is
 * worth more than one that appears to and does not, and this is the surface to
 * build real music on when there are files, a player and an export that carries
 * sound.
 */
export function MusicPanel({ editor }: { editor: EditorState }) {
  const track = editor.project.tracks.find((candidate) => candidate.kind === "audio");
  const current = track?.items.find(isAudio) ?? null;

  return (
    <Field label="Music">
      {current ? (
        <div className="flex items-center gap-2.5 rounded-md border border-hairline p-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-cloud text-ink-soft">
            <Music className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-ink">{current.title}</span>
            <span className="block text-[11px] tabular-nums text-ink-soft">
              {(current.durationMs / 1000).toFixed(0)}s
            </span>
          </span>
        </div>
      ) : null}

      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        There is no music library yet. Any audio on a generated clip is kept, and you can mute or
        level it from the audio track, but a separate soundtrack cannot be added here.
      </p>
    </Field>
  );
}
