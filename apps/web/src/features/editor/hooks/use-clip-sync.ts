"use client";

import { useEffect, useRef } from "react";

import { type VideoItem } from "@/lib/editor/types";

/**
 * Keeps the preview's `<video>` in step with the editor clock.
 *
 * The transport is a `requestAnimationFrame` loop rather than the media
 * element, because the timeline is longer than any one clip and has to keep
 * running across gaps, captions and the end of the last cut. That left the
 * video element attached to nothing: pressing play advanced a playhead while
 * the footage sat frozen on its first frame, which read as the video not
 * loading at all.
 *
 * So the clock stays the master and the element follows it. Drift is corrected
 * by seeking rather than by driving every frame, because a seek per frame stalls
 * the decoder and makes playback stutter worse than the drift it fixes.
 */

/** How far the element may drift before it is pulled back, in seconds. */
const DRIFT_TOLERANCE = 0.25;

/** Scrubbing should land on the frame asked for, so a paused seek is exact. */
const PAUSED_TOLERANCE = 0.01;

export function useClipSync({
  clip,
  currentMs,
  isPlaying,
  muted,
}: {
  clip: VideoItem | undefined;
  currentMs: number;
  isPlaying: boolean;
  muted: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Where in the source file the playhead sits. The timeline length already
  // accounts for speed, so the source runs at `speed` times wall-clock.
  const sourceSeconds =
    clip === undefined ? 0 : Math.max(0, ((currentMs - clip.startMs) / 1000) * clip.speed);

  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;

    element.playbackRate = clip.speed;
    element.volume = clip.volume;
    element.muted = muted;
  }, [clip, muted]);

  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;

    const tolerance = isPlaying ? DRIFT_TOLERANCE : PAUSED_TOLERANCE;
    if (Math.abs(element.currentTime - sourceSeconds) > tolerance) {
      element.currentTime = sourceSeconds;
    }

    if (isPlaying) {
      // Rejects when the browser blocks playback, which it does for a clip with
      // sound that no gesture asked for. The clock carries on either way rather
      // than the whole transport dying on one clip.
      void element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }, [clip, isPlaying, sourceSeconds]);

  return ref;
}
