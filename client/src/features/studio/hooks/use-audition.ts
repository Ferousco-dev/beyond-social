"use client";

import { useEffect, useState } from "react";

/** Only one thing is auditioned at a time: starting another stops the first. */
let current: HTMLMediaElement | null = null;

export function audition(element: HTMLMediaElement): void {
  if (current && current !== element) current.pause();
  current = element;
  element.currentTime = 0;
  void element.play().catch(() => undefined);
}

export function stopAudition(): void {
  current?.pause();
  current = null;
}

/** Whether a media element is playing, kept in step with its own events. */
export function usePlaying(element: HTMLMediaElement | null): boolean {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!element) return;
    const on = (): void => setPlaying(true);
    const off = (): void => setPlaying(false);
    element.addEventListener("play", on);
    element.addEventListener("pause", off);
    element.addEventListener("ended", off);
    return () => {
      element.removeEventListener("play", on);
      element.removeEventListener("pause", off);
      element.removeEventListener("ended", off);
      if (current === element) stopAudition();
    };
  }, [element]);
  return playing;
}
