"use client";

import { ArrowLeft, Flower2, ImagePlus } from "lucide-react";
import { useState } from "react";

import { type ComposerDraft } from "@/features/dashboard/hooks/use-composer-draft";
import { useComposerDrop } from "@/features/dashboard/hooks/use-composer-drop";
import { type EditorState } from "@/features/editor/hooks/use-editor-state";
import { type Playback } from "@/features/editor/hooks/use-playback";
import { EditorPreview } from "@/features/editor/components/editor-preview";
import { EditorTimeline } from "@/features/editor/components/editor-timeline";

export interface CanvasTake {
  readonly id: string;
  readonly url: string | null;
  readonly label: string;
}

export interface CanvasPreview {
  readonly url: string;
  readonly label: string;
  readonly kind: string;
}

interface WorkspaceCanvasProps {
  readonly projectId: string;
  readonly draft: ComposerDraft;
  readonly editor: EditorState;
  readonly playback: Playback;
  readonly takes: readonly CanvasTake[];
  readonly preview: CanvasPreview | null;
  readonly onPreviewTake: (take: CanvasTake) => void;
  readonly onClearPreview: () => void;
  readonly onOpenAssets: () => void;
}

export function WorkspaceCanvas({
  projectId,
  draft,
  editor,
  playback,
  takes,
  preview,
  onPreviewTake,
  onClearPreview,
  onOpenAssets,
}: WorkspaceCanvasProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Same upload path as the composer's + menu: images become photos, the first
  // video becomes footage, the first audio becomes the voice clip.
  const drop = useComposerDrop({
    projectId,
    onPhotos: draft.setPhotos,
    onVoice: draft.setVoice,
    onFootage: draft.setFootage,
    onError: setError,
    onBusyChange: setUploading,
  });
  const isEmpty = takes.length === 0 && editor.durationMs === 0 && preview === null;

  return (
    <div
      onDragEnter={drop.onDragEnter}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {drop.dragging ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border border-dashed border-primary bg-primary/5 text-sm font-medium text-primary"
        >
          Drop to attach it to this project
        </div>
      ) : null}

      {uploading || error ? (
        <div className="flex shrink-0 items-center gap-2 px-4 py-1.5" aria-live="polite">
          {uploading ? (
            <>
              <span className="spinner size-3.5 text-ink-soft" aria-hidden />
              <p className="text-xs text-ink-soft">Uploading media…</p>
            </>
          ) : null}
          {!uploading && error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
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
            {preview ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex h-10 shrink-0 items-center gap-2 border-b border-hairline px-4">
                  <button
                    type="button"
                    onClick={onClearPreview}
                    aria-label="Back to timeline"
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                    {preview.label}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-6">
                  {preview.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.url}
                      alt={preview.label}
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  ) : preview.kind === "voice" || preview.kind === "audio" ? (
                    <audio src={preview.url} controls className="w-full max-w-md" />
                  ) : (
                    <video
                      key={preview.url}
                      src={preview.url}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-full max-w-full rounded-lg"
                    />
                  )}
                </div>
              </div>
            ) : (
              <EditorPreview playback={playback} editor={editor} />
            )}
          </div>

          {takes.length > 0 ? (
            <ul aria-label="Takes" className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2">
              {takes.slice(0, 6).map((take) => (
                <li key={take.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onPreviewTake(take)}
                    aria-label={`Preview ${take.label}`}
                    className="block h-16 w-24 cursor-pointer overflow-hidden rounded-lg border border-hairline bg-cloud transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {take.url ? (
                      <video src={take.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-ink-soft">
                        {take.label}
                      </span>
                    )}
                  </button>
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
