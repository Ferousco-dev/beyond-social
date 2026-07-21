"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bs:notification-prefs";

export const NOTIFICATION_KEYS = [
  "draftReady",
  "postPublished",
  "publishFailed",
  "creditsLow",
  "weeklySummary",
  "productNews",
] as const;

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export type NotificationPrefs = Record<NotificationKey, boolean>;

/** Everything that reports on the user's own work is on by default. */
const DEFAULTS: NotificationPrefs = {
  draftReady: true,
  postPublished: true,
  publishFailed: true,
  creditsLow: true,
  weeklySummary: false,
  productNews: false,
};

function read(): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULTS;
    const stored = parsed as Partial<Record<NotificationKey, unknown>>;
    return NOTIFICATION_KEYS.reduce<NotificationPrefs>((prefs, key) => {
      const value = stored[key];
      return { ...prefs, [key]: typeof value === "boolean" ? value : DEFAULTS[key] };
    }, DEFAULTS);
  } catch {
    // A malformed or blocked store must not take the settings panel down.
    return DEFAULTS;
  }
}

export interface NotificationPrefsState {
  readonly prefs: NotificationPrefs;
  readonly toggle: (key: NotificationKey) => void;
  /** False until the stored value is read, so server and client agree. */
  readonly ready: boolean;
}

export function useNotificationPrefs(): NotificationPrefsState {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(read());
    setReady(true);
  }, []);

  const toggle = useCallback((key: NotificationKey) => {
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Persisting is a convenience; losing it must not break the toggle.
      }
      return next;
    });
  }, []);

  return { prefs, toggle, ready };
}
