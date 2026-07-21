"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bs:saved-trends";

function read(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // A malformed or blocked store should not take the page down.
    return [];
  }
}

export interface SavedTrends {
  readonly ids: ReadonlySet<string>;
  readonly toggle: (id: string) => void;
  /** False until the stored value is read, so the server and client agree. */
  readonly ready: boolean;
}

export function useSavedTrends(): SavedTrends {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(new Set(read()));
    setReady(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Saving is a convenience; losing it must not break the interaction.
      }
      return next;
    });
  }, []);

  return { ids, toggle, ready };
}
