"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { makeTwinVideo, twinVideoStatus, type TwinVideoState } from "../video-actions";

/**
 * Starting one twin video and watching it to the end.
 *
 * Polled rather than pushed, for the same reason training is: HeyGen answers a
 * poll and does not call back, and the row only moves when the scheduled poller
 * asks. So this watches the row, which is the record, rather than the provider,
 * which the browser cannot reach.
 */

/** Fast enough to feel like it is watching, slow enough not to hammer while nothing changes. */
const POLL_MS = 5000;

export type TwinVideoPhase =
  | { readonly kind: "idle" }
  | { readonly kind: "starting" }
  | { readonly kind: "rendering" }
  | { readonly kind: "done" }
  | { readonly kind: "error"; readonly message: string };

export interface TwinVideoRun {
  readonly phase: TwinVideoPhase;
  readonly busy: boolean;
  readonly start: (request: { avatarId: string; script: string }) => void;
}

export function useTwinVideo(onStarted?: () => void): TwinVideoRun {
  const [phase, setPhase] = useState<TwinVideoPhase>({ kind: "idle" });
  const [generationId, setGenerationId] = useState<string | null>(null);

  // A double submit is two renders and two charges, and `disabled` is a state
  // update that lands a render too late to catch the second click.
  const starting = useRef(false);

  useEffect(() => {
    if (generationId === null) return;
    let live = true;

    const tick = async (): Promise<void> => {
      const status = await twinVideoStatus(generationId);
      if (!live || !status) return;

      const settled: TwinVideoState[] = ["failed", "cancelled"];
      if (status.state === "ready") {
        setGenerationId(null);
        setPhase({ kind: "done" });
      } else if (settled.includes(status.state)) {
        setGenerationId(null);
        setPhase({ kind: "error", message: status.error ?? "That video did not finish." });
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [generationId]);

  const start = useCallback(
    (request: { avatarId: string; script: string }) => {
      if (starting.current) return;
      starting.current = true;
      setPhase({ kind: "starting" });

      void makeTwinVideo(request)
        .then((result) => {
          if (result.status !== "ok") {
            setPhase({ kind: "error", message: result.message });
            return;
          }
          setGenerationId(result.generationId);
          setPhase({ kind: "rendering" });
          onStarted?.();
        })
        // A transport failure throws rather than resolving to a status, the
        // same as any other server action call.
        .catch(() => setPhase({ kind: "error", message: "That video could not be started." }))
        .finally(() => {
          starting.current = false;
        });
    },
    [onStarted],
  );

  return { phase, busy: phase.kind === "starting" || phase.kind === "rendering", start };
}
