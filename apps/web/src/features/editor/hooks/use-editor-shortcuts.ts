"use client";

import { useEffect } from "react";

import { type ClipsState } from "./use-clips";
import { type Playback } from "./use-playback";

const SEEK_STEP_MS = 1_000;

/** True while the user is typing, when editor shortcuts must stay out of the way. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
}

export function useEditorShortcuts(playback: Playback, clips: ClipsState): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // The timeline and clips handle their own arrow keys before this runs.
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || isTextEntry(event.target)) return;

      switch (event.key) {
        case " ":
          playback.toggle();
          break;
        case "s":
          clips.split(playback.currentMs);
          break;
        case "Delete":
        case "Backspace":
          if (clips.selectedId) clips.remove(clips.selectedId);
          break;
        case "Escape":
          clips.select(null);
          break;
        case "ArrowLeft":
          playback.seek(playback.currentMs - SEEK_STEP_MS);
          break;
        case "ArrowRight":
          playback.seek(playback.currentMs + SEEK_STEP_MS);
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playback, clips]);
}
