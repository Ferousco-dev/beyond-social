"use client";

import { useCallback, useEffect, useState } from "react";

import { type TipId } from "@/lib/tips/tips";

const STORAGE_KEY = "bs:seen-tips";

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

/**
 * Which tips this browser has already been shown.
 *
 * Per device rather than per account, matching the checklist. Whether a tip has
 * been seen is a fact about a browser, and syncing it would mean dismissing one
 * on a laptop hides it on a phone where the control it points at sits somewhere
 * else entirely.
 *
 * `ready` exists because the server cannot know any of this. Rendering before
 * the stored value is read would flash a tip somebody dismissed weeks ago.
 */
export function useSeenTips() {
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSeen(new Set(read()));
    setReady(true);
  }, []);

  const dismiss = useCallback((id: TipId) => {
    setSeen((current) => {
      const next = new Set(current).add(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Private mode and full quotas both land here. The tip stays gone for
        // this session and comes back on the next one, which is survivable.
      }
      return next;
    });
  }, []);

  return { ready, seen, dismiss };
}
