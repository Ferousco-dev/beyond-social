"use client";

import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw } from "lucide-react";

import { type SaveState } from "../hooks/use-autosave";

/**
 * Whether the work is safe.
 *
 * Silent while idle, because a badge that is always on screen stops being read.
 * The two failure states are never silent: a user who does not know a save
 * failed will close the tab and lose the work.
 */
export function SaveIndicator({
  state,
  onRetry,
  canSave,
}: {
  state: SaveState;
  onRetry: () => void;
  /** False when there is no project to save against, so nothing is being kept. */
  canSave: boolean;
}) {
  /*
   * A project autosave cannot write to says so, permanently.
   *
   * This was the one state that rendered nothing: autosave is switched off for a
   * project that does not exist, the state never leaves idle, and the indicator
   * is silent while idle. So the timeline accepted every trim, caption and grade
   * and kept none of them, looking exactly like an editor that was saving fine.
   */
  if (!canSave) {
    return (
      <span
        title="This video is not part of a saved project, so changes here are not kept. Send a message in the chat to create one."
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-ink-soft"
      >
        <CloudOff className="size-3.5" aria-hidden />
        Not saving
      </span>
    );
  }

  if (state === "idle") return null;

  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Saving
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <Check className="size-3.5 text-success" aria-hidden />
        Saved
      </span>
    );
  }

  const conflict = state === "conflict";
  return (
    <button
      type="button"
      onClick={onRetry}
      title={
        conflict
          ? "This project was changed somewhere else. Saving again will keep this version."
          : "Your last change was not saved. Try again."
      }
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {conflict ? (
        <AlertTriangle className="size-3.5" aria-hidden />
      ) : (
        <RefreshCw className="size-3.5" aria-hidden />
      )}
      {conflict ? "Changed elsewhere" : "Not saved"}
    </button>
  );
}
