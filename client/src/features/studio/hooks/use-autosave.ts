"use client";

import { useEffect, useRef } from "react";

import { saveProject } from "../actions";
import { STUDIO_SAVE } from "../config";
import { useStudio } from "../store/editor-store";

/**
 * Saves a moment after the last change. A save names the version it started
 * from; if another tab saved first the server refuses, and we stop and say so
 * rather than overwrite their work.
 */
export function useAutosave(): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const flush = async (): Promise<void> => {
      const state = useStudio.getState();
      const { projectId, history, saved, saveStatus } = state;
      if (!projectId || saveStatus === "conflict" || inFlight.current) return;
      if (history.present === saved && saveStatus !== "pending") return;
      const snapshot = history.present;
      inFlight.current = true;
      state.setSaveStatus("saving");
      const result = await saveProject({
        id: projectId,
        title: state.title,
        document: snapshot,
        expectedVersion: state.version,
      });
      inFlight.current = false;
      if (result.ok) {
        useStudio.getState().markSaved(snapshot, result.version);
        if (useStudio.getState().history.present !== snapshot) schedule();
      } else useStudio.getState().setSaveStatus(result.conflict ? "conflict" : "error");
    };
    const schedule = (): void => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), STUDIO_SAVE.DEBOUNCE_MS);
    };
    const unsubscribe = useStudio.subscribe((s, p) => {
      if (s.gestureBase) return;
      if (s.history.present !== p.history.present || s.title !== p.title) schedule();
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
