"use client";

import { useWindowEvent } from "@/lib/hooks/use-event";

import { useStudio } from "../store/editor-store";
import { useTimelineActions } from "./use-timeline-actions";

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function useShortcuts(): void {
  const { split, remove } = useTimelineActions();

  useWindowEvent("keydown", (event) => {
    if (isTyping(event.target)) return;
    const state = useStudio.getState();
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) state.redo();
      else state.undo();
    } else if (event.key === " ") {
      event.preventDefault();
      state.togglePlay();
    } else if (event.key.toLowerCase() === "b" && !mod) split();
    else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      remove(event.shiftKey);
    } else if (event.key === "ArrowLeft")
      state.seek(state.currentTime - (event.shiftKey ? 1 : 0.1));
    else if (event.key === "ArrowRight")
      state.seek(state.currentTime + (event.shiftKey ? 1 : 0.1));
  });
}
