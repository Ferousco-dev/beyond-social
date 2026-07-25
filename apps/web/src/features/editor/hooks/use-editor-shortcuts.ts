"use client";

import { useEffect } from "react";

import { type EditorState } from "./use-editor-state";
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

export function useEditorShortcuts(playback: Playback, editor: EditorState): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // The timeline and clips handle their own arrow keys before this runs.
      if (event.defaultPrevented) return;
      if (isTextEntry(event.target)) return;

      const accel = event.metaKey || event.ctrlKey;

      // Undo and redo are the only accelerator shortcuts the editor claims.
      if (accel) {
        const key = event.key.toLowerCase();
        if (key === "z" && event.shiftKey) editor.redo();
        else if (key === "z") editor.undo();
        else if (key === "d" && editor.selectedId) editor.duplicate(editor.selectedId);
        else return;
        event.preventDefault();
        return;
      }

      if (event.altKey) return;

      switch (event.key) {
        case " ":
          playback.toggle();
          break;
        case "s":
          editor.split(playback.currentMs);
          break;
        case "Delete":
        case "Backspace":
          if (editor.selectedId) editor.remove(editor.selectedId);
          break;
        case "Escape":
          editor.select(null);
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
  }, [playback, editor]);
}
