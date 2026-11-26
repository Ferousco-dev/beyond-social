"use client";

import { useSyncExternalStore } from "react";

const never = (): (() => void) => () => undefined;

/**
 * A value that only the browser can read (saved settings, the current theme),
 * without an effect: `serverValue` during server rendering and hydration, then
 * `read()` in the browser. Pass `subscribe` when the value can change later.
 * `read` must return the same value for the same state (no new objects).
 */
export function useClientValue<T>(read: () => T, serverValue: T, subscribe: (onChange: () => void) => () => void = never): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
