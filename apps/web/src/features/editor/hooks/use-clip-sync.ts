"use client";

import { useEffect, useRef, useState } from "react";

import { type VideoItem } from "@/lib/editor/types";

/**
 * Keeps the preview's `<video>` in step with the editor clock.
 *
 * The transport is a `requestAnimationFrame` loop rather than the media element,
 * because a timeline is longer than any one clip and has to keep running across
 * gaps, captions and the end of the last cut.
 *
 * The hard part is that the element has a clock of its own. The first version of
 * this compared the two on every animation frame and seeked whenever they were
 * more than a quarter second apart, which is a feedback loop: seeking interrupts
 * decoding, the interruption costs time, the gap widens, and it seeks again.
 * Playback stuttered into a standstill and read as video that would not play.
 *
 * So the element is left alone while it plays. It is moved only when there is a
 * reason to move it, and drift is checked on a slow interval rather than per
 * frame.
 */

/** How far the element may drift before it is pulled back, in seconds. */
const DRIFT_TOLERANCE = 0.5;

/** How often drift is checked while playing. Far below frame rate, on purpose. */
const DRIFT_CHECK_MS = 1000;

export interface ClipSync {
  readonly ref: React.RefObject<HTMLVideoElement | null>;
  /** Set when the browser could not load or decode this clip. */
  readonly error: string | null;
  /** Handed to the element's `onError`, so the frame can say what went wrong. */
  readonly onError: () => void;
}

export function useClipSync({
  clip,
  currentMs,
  isPlaying,
  muted,
  seekNonce,
}: {
  clip: VideoItem | undefined;
  currentMs: number;
  isPlaying: boolean;
  muted: boolean;
  seekNonce: number;
}): ClipSync {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * The clock is read through a ref rather than a dependency.
   *
   * Every effect below needs to know where the playhead is, and none of them
   * should run again because it moved. Depending on `currentMs` is exactly what
   * caused the seek loop.
   */
  const clockRef = useRef(currentMs);
  clockRef.current = currentMs;

  /** Where in the source file the playhead sits, right now. */
  const sourceSeconds = (): number =>
    clip === undefined ? 0 : Math.max(0, ((clockRef.current - clip.startMs) / 1000) * clip.speed);

  // Grade and rate. Cheap, and unrelated to position.
  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;

    element.playbackRate = clip.speed;
    element.volume = clip.volume;
    element.muted = muted;
  }, [clip, muted]);

  // A different clip is a different file, so it starts wherever the playhead
  // already is inside it rather than at zero.
  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;

    setError(null);
    element.currentTime = sourceSeconds();
    // Only on a clip change. `sourceSeconds` reads the clock through a ref, so
    // it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id]);

  // A jump the user asked for. Nothing else moves the element's position.
  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;
    element.currentTime = sourceSeconds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekNonce]);

  useEffect(() => {
    const element = ref.current;
    if (!element || clip === undefined) return;

    if (!isPlaying) {
      element.pause();
      return;
    }

    // Rejects when the browser blocks playback, which it does for a clip with
    // sound that no gesture asked for. The clock carries on either way rather
    // than the whole transport dying on one clip.
    void element.play().catch(() => undefined);

    /*
     * Correction, not synchronisation. A tenth of a second out is invisible and
     * not worth interrupting a decoder over; half a second is a cut landing
     * visibly late, which is worth one seek.
     */
    const timer = window.setInterval(() => {
      if (Math.abs(element.currentTime - sourceSeconds()) > DRIFT_TOLERANCE) {
        element.currentTime = sourceSeconds();
      }
    }, DRIFT_CHECK_MS);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id, isPlaying]);

  // A clip whose link has expired and a clip in a codec this browser cannot
  // decode both render as a black rectangle otherwise, which is
  // indistinguishable from a bug in us.
  return { ref, error, onError: () => setError(describeMediaError(ref.current)) };
}

/** Reads the element's own failure into something a person can act on. */
function describeMediaError(element: HTMLVideoElement | null): string {
  const code = element?.error?.code;
  if (code === MediaError.MEDIA_ERR_NETWORK) return "This clip could not be downloaded.";
  if (code === MediaError.MEDIA_ERR_DECODE) return "This clip could not be decoded.";
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    // Overwhelmingly the expired-link case: the bucket is private and the URL is
    // signed for an hour, so a tab left open overnight lands exactly here.
    return "This clip could not be loaded. Reload the page to refresh its link.";
  }
  return "This clip could not be played.";
}
