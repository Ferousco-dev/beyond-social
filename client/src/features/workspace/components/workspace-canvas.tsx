"use client";

import { Flower2, ImagePlus } from "lucide-react";
import { useState } from "react";

import { type EditorState } from "@/features/editor/hooks/use-editor-state";
import { type Playback } from "@/features/editor/hooks/use-playback";
import { EditorPreview } from "@/features/editor/components/editor-preview";
import { EditorTimeline } from "@/features/editor/components/editor-timeline";

export interface CanvasTake {
  readonly id: string;
  readonly url: string | null;
  readonly label: string;
}

interface WorkspaceCanvasProps {
  readonly editor: EditorState;
  readonly playback: Playback;
  readonly takes: readonly CanvasTake[];
  readonly onOpenAssets: () => void;
}

export function WorkspaceCanvas({ editor, playback, takes, onOpenAssets }: WorkspaceCanvasProps) {
  const [dragging, setDragging] = useState(false);
  const isEmpty = takes.length === 0 && editor.durationMs === 0;

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onOpenAssets();
      }}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {dragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border border-dashed border-primary bg-primary/5 text-sm font-medium text-primary"
        >
          Drop media to attach it in the chat
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Flower2 className="size-10 text-ink-soft" aria-hidden strokeWidth={1.5} />
          <p className="text-lg text-ink">Start creating or drop media</p>
          <button
            type="button"
            onClick={onOpenAssets}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-hairline bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ImagePlus className="size-4" aria-hidden />
            Browse assets
          </button>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <EditorPreview playback={playback} editor={editor} />
          </div>

          {takes.length > 0 ? (
            <ul aria-label="Takes" className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2">
              {takes.slice(0, 6).map((take) => (
                <li
                  key={take.id}
                  className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-hairline bg-cloud"
                >
                  {take.url ? (
                    // Plain video: signed, short-lived URLs the optimizer cannot preconfigure.
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={take.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-ink-soft">
                      {take.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          <EditorTimeline playback={playback} editor={editor} />
        </>
      )}
    </div>
  );
}
