"use client";

import { useEffect, useRef } from "react";

/** Stops the page behind from scrolling while `locked` is true, and always lets go. */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/** Logs an error that reached an error screen, once per error. */
export function useReportError(error: unknown): void {
  useEffect(() => {
    console.error(error);
  }, [error]);
}

/**
 * One-off work when a screen opens: a prefetch, a first check, a registration.
 * Runs once after the first render (twice in development's strict mode, so it
 * must be safe to repeat). Return a function to undo it when the screen closes.
 */
export function useOnMount(task: () => void | (() => void)): void {
  const first = useRef(task);
  useEffect(() => first.current(), []);
}
