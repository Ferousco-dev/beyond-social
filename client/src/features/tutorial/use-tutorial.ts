"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isTrackCompleted,
  markTrackCompleted,
  parseProgress,
  resetTrack,
  TUTORIAL_TRACKS,
  type TutorialStep,
  type TutorialTrackId,
} from "./steps";

const STORAGE_KEY = "bs:tutorials:v1";
const REPLAY_EVENT = "bs:tutorial-replay";

function readProgress() {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { completed: [] as const };
  }
}

function writeProgress(progress: { readonly completed: readonly TutorialTrackId[] }): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors in private browsing.
  }
}

/** Triggers a contextual tutorial track to replay on the current screen. */
export function replayTutorial(track: TutorialTrackId): void {
  writeProgress(resetTrack(readProgress(), track));
  window.dispatchEvent(new CustomEvent<TutorialTrackId>(REPLAY_EVENT, { detail: track }));
}

export interface ActiveTutorial {
  readonly step: TutorialStep | null;
  readonly index: number;
  readonly total: number;
  readonly next: () => void;
  readonly back: () => void;
  readonly dismiss: () => void;
}

/**
 * Manages one contextual tutorial track. Starts automatically on a user's first
 * visit to the screen (once its anchor exists in the DOM) and can be replayed anytime.
 */
export function useTutorial(track: TutorialTrackId): ActiveTutorial {
  const steps = TUTORIAL_TRACKS[track];
  const [index, setIndex] = useState<number | null>(null);

  const finish = useCallback(() => {
    writeProgress(markTrackCompleted(readProgress(), track));
    setIndex(null);
  }, [track]);

  // Auto-start once on first visit if not completed yet.
  useEffect(() => {
    const progress = readProgress();
    if (isTrackCompleted(progress, track)) return;
    // Short delay lets panels/layout finish mounting so the first anchor is measured cleanly.
    const timer = window.setTimeout(() => {
      const firstVisible = steps.findIndex((s) => document.querySelector(`[data-tip-anchor="${s.anchor}"]`) !== null);
      if (firstVisible >= 0) setIndex(firstVisible);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [track, steps]);

  // Listen for manual replay clicks from the ? button.
  useEffect(() => {
    const onReplay = (event: Event): void => {
      const custom = event as CustomEvent<TutorialTrackId>;
      if (custom.detail !== track) return;
      const firstVisible = steps.findIndex((s) => document.querySelector(`[data-tip-anchor="${s.anchor}"]`) !== null);
      setIndex(firstVisible >= 0 ? firstVisible : 0);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, [track, steps]);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current === null) return null;
      for (let i = current + 1; i < steps.length; i += 1) {
        if (document.querySelector(`[data-tip-anchor="${steps[i]!.anchor}"]`) !== null) return i;
      }
      writeProgress(markTrackCompleted(readProgress(), track));
      return null;
    });
  }, [steps, track]);

  const back = useCallback(() => {
    setIndex((current) => {
      if (current === null || current <= 0) return current;
      for (let i = current - 1; i >= 0; i -= 1) {
        if (document.querySelector(`[data-tip-anchor="${steps[i]!.anchor}"]`) !== null) return i;
      }
      return current;
    });
  }, [steps]);

  const step = index !== null ? (steps[index] ?? null) : null;

  // Gameplay-style progression: if a step opts in, interacting with the highlighted element advances it.
  useEffect(() => {
    if (!step?.advanceOnInteract) return;
    const el = document.querySelector(`[data-tip-anchor="${step.anchor}"]`);
    if (!el) return;
    const onClick = (): void => next();
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [step, next]);

  // Keyboard shortcuts: Escape skips the tutorial.
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, finish]);

  return {
    step,
    index: index ?? 0,
    total: steps.length,
    next,
    back,
    dismiss: finish,
  };
}
