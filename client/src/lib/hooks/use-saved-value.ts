"use client";

import { useEffect } from "react";

/**
 * Keeps `value` saved in localStorage under `key` while `enabled`, so a form
 * survives a reload. Pass enabled=false until the saved copy has been read, or
 * the empty form would overwrite it. Private browsing just skips the save.
 */
export function useSavedValue(key: string, value: unknown, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, value, enabled]);
}
