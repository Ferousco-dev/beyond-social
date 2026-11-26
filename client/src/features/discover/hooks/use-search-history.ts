"use client";

import { useCallback, useState } from "react";

import { useOnMount } from "@/lib/hooks/use-page-effects";

import { type ScrapePlatform } from "@/lib/social-scrape/types";

const STORAGE_KEY = "bs:discover-history";

/** Enough to get back to this week's work, short enough to read at a glance. */
const KEPT = 8;

export interface PastSearch {
  readonly term: string;
  readonly platform: ScrapePlatform;
}

/** The searches stored on this device, or none when the store is empty, malformed or blocked. */
function readStoredHistory(): readonly PastSearch[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is PastSearch =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as PastSearch).term === "string" &&
          ((entry as PastSearch).platform === "tiktok" || (entry as PastSearch).platform === "instagram"),
      )
      .slice(0, KEPT);
  } catch {
    return [];
  }
}

/**
 * What has been searched on this device.
 *
 * Kept locally rather than on the account, for the same reason the onboarding
 * checklist is: this is a fact about one browser window, not about the person.
 * Syncing it would mean a search on a laptop rearranging the phone.
 *
 * The point is not nostalgia. A search costs a scrape and several seconds, and
 * the cache makes a repeat free, so the fastest thing in the product is a
 * search somebody has already run. This is the way back to one.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<readonly PastSearch[]>([]);

  useOnMount(() => setHistory(readStoredHistory()));

  const remember = useCallback((term: string, platform: ScrapePlatform) => {
    const cleaned = term.trim();
    if (cleaned === "") return;

    setHistory((current) => {
      // Newest first, and the same term on the same platform moves rather than
      // repeating: a row of five identical searches is not a history.
      const next = [
        { term: cleaned, platform },
        ...current.filter(
          (entry) =>
            entry.term.toLowerCase() !== cleaned.toLowerCase() || entry.platform !== platform,
        ),
      ].slice(0, KEPT);

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode and full quotas both land here. It still works for this
        // session; it just forgets on the next one.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // As above.
    }
  }, []);

  return { history, remember, clear };
}
