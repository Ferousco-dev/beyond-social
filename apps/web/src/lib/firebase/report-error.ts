"use client";

import { track } from "./client";

/** Firebase Analytics caps a param string at 100 characters. */
function truncate(value: string, max = 100): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Reports a client-side error to Firebase Analytics as an `exception` event,
 * on top of the console logging every call site already did.
 *
 * This is client-side crash visibility, not the server-side error tracking
 * and alerting a tool like Sentry gives: nothing here observes a server
 * action, an edge function, or the worker. Those still fail silently unless
 * someone is watching the logs. See docs/ilana-audit.md, F-03.
 */
export function reportError(error: Error, context?: Record<string, string>): void {
  console.error(error);

  track("exception", {
    description: truncate(`${error.name}: ${error.message}`),
    fatal: false,
    ...context,
  });
}
