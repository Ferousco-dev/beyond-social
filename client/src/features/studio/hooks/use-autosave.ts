"use client";

import { useEffect, useRef } from "react";

import { saveProject } from "../actions";
import { STUDIO_SAVE } from "../config";
import { useStudio } from "../store/editor-store";
import { clearBackup, saveBackup } from "./draft-backup";

/** Asks the editor to try saving again now, for the Retry button. */
export const RETRY_SAVE_EVENT = "bs:retry-save";

/** What a project is called when its name was cleared; the server refuses an empty one. */
export const FALLBACK_TITLE = "Untitled project";

/** Waits before retrying a failed save, doubling up to the cap. */
const RETRY_MS = [3_000, 8_000, 20_000] as const;
const MAX_RETRIES = 5;

/**
 * Saves a moment after the last change. A save names the version it started
 * from; if another tab saved first the server refuses, and we stop and say so
 * rather than overwrite their work.
 *
 * Anything still unsaved is sent the moment the person leaves (switching tabs,
 * navigating away, unmounting), and a failed save tries again on its own.
 */
export function useAutosave(): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const failures = useRef(0);

  useEffect(() => {
    const clear = (): void => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    const schedule = (delay: number = STUDIO_SAVE.DEBOUNCE_MS): void => {
      clear();
      timer.current = setTimeout(() => void flush(), delay);
    };

    const flush = async (): Promise<void> => {
      clear();
      const state = useStudio.getState();
      const { projectId, history, saved, saveStatus } = state;
      if (!projectId || saveStatus === "conflict" || inFlight.current) return;
      if (history.present === saved && saveStatus !== "pending" && saveStatus !== "error") return;
      const snapshot = history.present;
      const title = state.title.trim() || FALLBACK_TITLE;
      inFlight.current = true;
      state.setSaveStatus("saving");
      // Keep a copy on this device before anything can go wrong on the way to the server.
      saveBackup(projectId, { version: state.version, title, document: snapshot });
      // A dropped connection rejects instead of answering; it counts as a failed save like any other.
      const result = await saveProject({ id: projectId, title, document: snapshot, expectedVersion: state.version }).catch(
        () => ({ ok: false as const, message: "offline", conflict: false }),
      );
      inFlight.current = false;
      const now = useStudio.getState();
      if (result.ok) {
        failures.current = 0;
        now.markSaved(snapshot, result.version);
        if (now.history.present === snapshot && (now.title.trim() || FALLBACK_TITLE) === title) clearBackup(projectId);
        // Something changed while the save was in the air, the project or only its name.
        if (now.history.present !== snapshot || (now.title.trim() || FALLBACK_TITLE) !== title) {
          now.setSaveStatus("pending");
          schedule();
        }
      } else if (result.conflict) now.setSaveStatus("conflict");
      else {
        now.setSaveStatus("error");
        // A few tries, then wait for the next edit; this must not loop forever after the editor closes.
        if (failures.current < MAX_RETRIES) {
          const wait = RETRY_MS[Math.min(failures.current, RETRY_MS.length - 1)]!;
          failures.current += 1;
          schedule(wait);
        }
      }
    };

    const unsubscribe = useStudio.subscribe((s, p) => {
      if (s.gestureBase) return;
      if (s.history.present !== p.history.present || s.title !== p.title) {
        failures.current = 0;
        schedule();
      }
    });

    const leave = (): void => void flush();
    // Back online, or the person pressed Retry: try again at once instead of waiting out the delay.
    const retryNow = (): void => {
      failures.current = 0;
      void flush();
    };
    window.addEventListener("online", retryNow);
    window.addEventListener(RETRY_SAVE_EVENT, retryNow);
    const onHide = (): void => {
      if (document.visibilityState === "hidden") leave();
    };
    // Closing the tab cannot wait for a reply, so warn when something is still unsaved.
    const onUnload = (event: BeforeUnloadEvent): void => {
      const { saveStatus, history, saved } = useStudio.getState();
      if (saveStatus === "conflict") return;
      if (saveStatus !== "saved" || history.present !== saved) {
        leave();
        event.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", leave);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("online", retryNow);
      window.removeEventListener(RETRY_SAVE_EVENT, retryNow);
      // Leaving the editor in the app: send what is pending instead of dropping it.
      leave();
      clear();
    };
  }, []);
}
