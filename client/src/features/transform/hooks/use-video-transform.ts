"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getVideoJob, startVideoTransform } from "../actions";
import { isFinished, type JobView } from "../types";
import { useJobSocket } from "@/lib/go-api/use-job-socket";

/** How often to ask over HTTP while the socket is not connected. */
const POLL_MS = 5_000;

export interface VideoTransform {
  readonly job: JobView | null;
  readonly starting: boolean;
  readonly error: string | null;
  readonly unconfigured: boolean;
  readonly start: (prompt: string) => void;
  readonly reset: () => void;
}

/**
 * Starting a transformation and following it to the end.
 *
 * Status arrives over the WebSocket. If the socket is unavailable, or drops,
 * the job is polled over HTTP instead and re-read on every reconnect, so a
 * missed event never leaves the screen stuck.
 */
export function useVideoTransform(videoId: string): VideoTransform {
  const [job, setJob] = useState<JobView | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [socketUp, setSocketUp] = useState(false);
  // One key per attempt: a retried or double-clicked request maps to one job.
  const attemptKey = useRef(crypto.randomUUID());

  const active = job !== null && !isFinished(job);
  const jobId = job?.id ?? null;

  const refresh = useCallback(async () => {
    if (!jobId) return;
    const result = await getVideoJob(jobId);
    if (result.status === "ok") setJob(result.job);
  }, [jobId]);

  useJobSocket({ jobId, active, onUpdate: setJob, onResync: () => void refresh(), onConnection: setSocketUp });

  useEffect(() => {
    if (!active || socketUp) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [active, socketUp, refresh]);

  const start = useCallback(
    (prompt: string) => {
      setStarting(true);
      setError(null);
      void startVideoTransform({ videoId, prompt, idempotencyKey: attemptKey.current })
        .then((result) => {
          if (result.status === "ok") setJob(result.job);
          else if (result.status === "unconfigured") setUnconfigured(true);
          else setError(result.message);
        })
        .catch(() => setError("Could not start the transformation. Try again."))
        .finally(() => setStarting(false));
    },
    [videoId],
  );

  const reset = useCallback(() => {
    attemptKey.current = crypto.randomUUID();
    setJob(null);
    setError(null);
  }, []);

  return { job, starting, error, unconfigured, start, reset };
}
