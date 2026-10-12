"use client";

import { useCallback, useState } from "react";

export const MIN_PANEL_WIDTH = 300;
export const MAX_PANEL_WIDTH = 560;

const DEFAULT_PANEL_WIDTH = 380;
const STORAGE_KEY = "workspace.assistant.width";

function load(): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved)) return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, saved));
  } catch {
    // Private browsing or blocked storage: fall through to the default.
  }
  return DEFAULT_PANEL_WIDTH;
}

/** Draggable panel width, remembered per browser. */
export function usePanelWidth(): {
  readonly width: number;
  readonly commit: (next: number) => void;
} {
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? DEFAULT_PANEL_WIDTH : load(),
  );

  const commit = useCallback((next: number) => {
    const clamped = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(next)));
    setWidth(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // Width still applies for this session; it just will not persist.
    }
  }, []);

  return { width, commit };
}
