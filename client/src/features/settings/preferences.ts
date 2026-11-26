"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Small, global preferences that apply everywhere rather than to one video.
 * Kept in this browser for now; they move to the account once the server
 * stores per-person preferences.
 */

const EMAIL_WHEN_READY = "bs:pref:email-when-ready";
const CHANGED = "bs:pref-changed";

/** Whether to email the person when a video finishes. Off until they turn it on. */
export function emailWhenReady(): boolean {
  try {
    return window.localStorage.getItem(EMAIL_WHEN_READY) === "1";
  } catch {
    return false;
  }
}

function setEmailWhenReady(on: boolean): void {
  try {
    window.localStorage.setItem(EMAIL_WHEN_READY, on ? "1" : "0");
  } catch {
    // Private browsing: the switch still shows the choice for this visit.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useEmailWhenReady(): readonly [boolean, (on: boolean) => void] {
  const value = useSyncExternalStore(subscribe, emailWhenReady, () => false);
  const set = useCallback((on: boolean) => setEmailWhenReady(on), []);
  return [value, set] as const;
}
