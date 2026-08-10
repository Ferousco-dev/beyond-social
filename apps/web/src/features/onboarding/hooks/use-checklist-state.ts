"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bs:onboarding-checklist";

interface Stored {
  readonly collapsed: boolean;
  readonly dismissed: boolean;
}

const DEFAULTS: Stored = { collapsed: false, dismissed: false };

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULTS;

    const value = parsed as Partial<Stored>;
    return {
      collapsed: value.collapsed === true,
      dismissed: value.dismissed === true,
    };
  } catch {
    // A malformed or blocked store should not take the dashboard down.
    return DEFAULTS;
  }
}

/**
 * Whether the checklist is open, shut, or gone.
 *
 * Kept on the device rather than the account, deliberately. This is a preference
 * about one browser window, not a fact about the user, and syncing it would mean
 * collapsing it on a laptop closes it on a phone mid-task.
 *
 * `ready` exists because the server cannot know any of this. Rendering the panel
 * before the stored value is read would flash it open for somebody who shut it
 * a week ago.
 */
export function useChecklistState() {
  const [state, setState] = useState<Stored>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const update = useCallback((next: Stored) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode and full quotas both land here. The panel still works for
      // this session; it just forgets on the next one.
    }
  }, []);

  return {
    ready,
    collapsed: state.collapsed,
    dismissed: state.dismissed,
    toggleCollapsed: useCallback(
      () => update({ ...state, collapsed: !state.collapsed }),
      [state, update],
    ),
    dismiss: useCallback(() => update({ ...state, dismissed: true }), [state, update]),
  };
}
