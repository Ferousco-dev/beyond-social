"use client";

import { useCallback, useEffect, useRef } from "react";

import { pollGeneration } from "@/features/generation/actions";

/**
 * Polls generations until they finish.
 *
 * Bounded on purpose. The previous version polled forever, so a generation that
 * hung left a browser tab calling the server every three seconds indefinitely
 * and a spinner that never resolved into either an answer or an error.
 */

const POLL_INTERVAL_MS = 3_000;

/** Past this a generation is not slow, it is stuck, and saying so beats a spinner. */
const POLL_TIMEOUT_MS = 8 * 60_000;

export type PollOutcome =
  { status: "ready"; resultUrl: string | null } | { status: "failed"; reason: string };

export function useGenerationPoll(onSettled: (id: string, outcome: PollOutcome) => void) {
  const timers = useRef(new Map<string, number>());
  const settled = useRef(onSettled);
  settled.current = onSettled;

  const stop = useCallback((generationId: string) => {
    const timer = timers.current.get(generationId);
    if (timer !== undefined) {
      window.clearInterval(timer);
      timers.current.delete(generationId);
    }
  }, []);

  const watch = useCallback(
    (generationId: string) => {
      // Guard against double-watching the same generation, which would double
      // the request rate and could report the outcome twice.
      if (timers.current.has(generationId)) return;

      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        void (async () => {
          if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            stop(generationId);
            settled.current(generationId, {
              status: "failed",
              reason: "This is taking longer than expected. It may still finish, so check back.",
            });
            return;
          }

          const result = await pollGeneration(generationId);

          // `stop` may have run while that request was in flight (the user
          // cancelled the draft), which clears the interval but cannot cancel a
          // request already sent. Settling anyway would surface a notice for a
          // draft the person already dismissed.
          if (!timers.current.has(generationId)) return;

          if (result.status === "ready") {
            stop(generationId);
            settled.current(generationId, { status: "ready", resultUrl: result.resultUrl });
          } else if (result.status === "failed" || result.status === "error") {
            stop(generationId);
            settled.current(generationId, {
              status: "failed",
              reason: "That generation did not complete. You can try again.",
            });
          }
        })();
      }, POLL_INTERVAL_MS);

      timers.current.set(generationId, timer);
    },
    [stop],
  );

  // Every interval is cleared on unmount, so navigating away stops the polling
  // rather than leaving it running against a screen nobody is looking at.
  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearInterval(timer));
      active.clear();
    };
  }, []);

  // `stop` is exported so cancelling can end the polling immediately, rather
  // than leaving an interval running against a draft the person dismissed.
  return { watch, stop };
}
