"use client";

import { useEffect, useRef } from "react";

/** Calls `callback` every `ms` while `ms` is a number; pass null to stop. Always cleared on unmount. */
export function useInterval(callback: () => void, ms: number | null): void {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (ms === null) return;
    const timer = window.setInterval(() => latest.current(), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
}

/**
 * Calls `callback` once, `ms` after `ms` becomes a number (or after `key`
 * changes); pass null to cancel. Always cleared on unmount.
 */
export function useTimeout(callback: () => void, ms: number | null, key?: unknown): void {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (ms === null) return;
    const timer = window.setTimeout(() => latest.current(), ms);
    return () => window.clearTimeout(timer);
  }, [ms, key]);
}
