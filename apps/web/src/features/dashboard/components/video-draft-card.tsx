"use client";

import { Pause, Play } from "lucide-react";
import { type Route } from "next";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { type MessageDraft } from "@/lib/chat/thread";

import { DraftMenu } from "./draft-menu";

/**
 * A finished render in the thread.
 *
 * The whole tile used to be a link to the editor, so there was no way to simply
 * watch the thing that had just been made: the one obvious gesture on a video
 * took you somewhere else. Playback happens here now, and the editor moved into
 * the overflow menu beside it.
 */
export function VideoDraftCard({
  draft,
  editorHref,
  onRegenerate,
  regenerating,
}: {
  draft: MessageDraft;
  editorHref: Route;
  onRegenerate?: (generationId: string) => void;
  regenerating?: boolean;
}): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      // A rejected play (autoplay policy, a codec the browser will not take)
      // must leave the control showing "play" rather than a pause button over a
      // still frame, which reads as though the video is broken.
      void video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const hasVideo = draft.resultUrl !== null;

  return (
    <div className="mt-3 w-44">
      <div className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-hairline bg-cloud">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={draft.resultUrl ?? undefined}
            playsInline
            preload="metadata"
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        {hasVideo ? (
          <button
            type="button"
            onClick={toggle}
            // The control covers the tile so the whole thumbnail is the play
            // target, which is what people already expect from a video.
            className="absolute inset-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/30"
            aria-label={playing ? "Pause draft" : "Play draft"}
          >
            <span
              className={
                "inline-flex size-10 items-center justify-center rounded-full bg-paper text-ink shadow-card transition-opacity " +
                // Once it is playing the control gets out of the way, and comes
                // back on hover or keyboard focus so it is never unreachable.
                (playing ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" : "")
              }
            >
              {playing ? (
                <Pause className="size-3.5" aria-hidden />
              ) : (
                <Play className="size-3.5 translate-x-px" aria-hidden />
              )}
            </span>
          </button>
        ) : null}

        <div className="absolute right-1.5 top-1.5">
          <DraftMenu
            editorHref={editorHref}
            busy={regenerating}
            onRegenerate={
              onRegenerate && draft.generationId
                ? () => onRegenerate(draft.generationId)
                : undefined
            }
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        {regenerating ? "Starting another render..." : "Draft ready"}
      </p>
    </div>
  );
}
