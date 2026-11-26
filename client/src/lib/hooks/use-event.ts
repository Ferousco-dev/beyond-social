"use client";

import { useEffect, useRef } from "react";

/**
 * Listens to a window event for as long as the component is on screen. The
 * handler may change on every render without re-subscribing, and the listener
 * is always removed, which are the two things hand-written effects get wrong.
 */
export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void {
  const latest = useRef(handler);
  latest.current = handler;
  const passive = options?.passive;
  const capture = options?.capture;
  useEffect(() => {
    const listener = (event: WindowEventMap[K]): void => latest.current(event);
    window.addEventListener(type, listener, { passive, capture });
    return () => window.removeEventListener(type, listener, { capture });
  }, [type, passive, capture]);
}

/** The same as useWindowEvent, for events on the document. `capture` hears the event before any handler below can stop it. */
export function useDocumentEvent<K extends keyof DocumentEventMap>(type: K, handler: (event: DocumentEventMap[K]) => void, capture = false): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const listener = (event: DocumentEventMap[K]): void => latest.current(event);
    document.addEventListener(type, listener, capture);
    return () => document.removeEventListener(type, listener, capture);
  }, [type, capture]);
}
