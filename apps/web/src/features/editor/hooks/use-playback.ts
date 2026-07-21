"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clamp } from "@/lib/editor/timeline";

export interface Playback {
  readonly currentMs: number;
  readonly isPlaying: boolean;
  readonly durationMs: number;
  readonly toggle: () => void;
  readonly seek: (ms: number) => void;
}

/**
 * Drives the editor clock. There is no media element yet, so the transport runs
 * off requestAnimationFrame; swapping in a real <video> later means replacing
 * this hook rather than every consumer.
 */
export function usePlayback(durationMs: number): Playback {
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    let previous = performance.now();
    const step = (now: number): void => {
      const elapsed = now - previous;
      previous = now;

      setCurrentMs((ms) => {
        const next = ms + elapsed;
        if (next >= durationMs) {
          setIsPlaying(false);
          return durationMs;
        }
        return next;
      });

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying, durationMs]);

  const seek = useCallback(
    (ms: number) => {
      setCurrentMs(clamp(ms, 0, durationMs));
    },
    [durationMs],
  );

  const toggle = useCallback(() => {
    setIsPlaying((playing) => {
      // Restarting from the end is friendlier than a dead play button.
      if (!playing && currentMs >= durationMs) setCurrentMs(0);
      return !playing;
    });
  }, [currentMs, durationMs]);

  return { currentMs, isPlaying, durationMs, toggle, seek };
}
