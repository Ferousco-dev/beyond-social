"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isFinished, type JobView } from "@/lib/go-api/jobs";
import { useJobSocket } from "@/lib/go-api/use-job-socket";

import { getAvatarVideo, startAvatarVideo } from "../avatar-video-actions";

/** How often to ask over HTTP while the socket is not connected. */
const POLL_MS = 6_000;

export interface AvatarVideo {
  readonly job: JobView | null;
  readonly starting: boolean;
  readonly error: string | null;
  readonly unconfigured: boolean;
  readonly start: (avatarId: string, script: string) => void;
  readonly reset: () => void;
}

/**
 * Starting an avatar video and following it to the end.
 *
 * Status arrives over the WebSocket. If the socket is unavailable or drops, the
 * video is read over HTTP instead, and once on every reconnect, so a missed
 * event never leaves the screen stuck.
 */
export function useAvatarVideo(): AvatarVideo {
  const [job, setJob] = useState<JobView | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [socketUp, setSocketUp] = useState(false);
  const attemptKey = useRef(crypto.randomUUID());

  const active = job !== null && !isFinished(job);
  const jobId = job?.id ?? null;

  const refresh = useCallback(async () => {
    if (!jobId) return;
    const result = await getAvatarVideo(jobId);
    if (result.status === "ok") setJob(result.job);
  }, [jobId]);

  // A finished video's file URL is read once more over HTTP: the one in the
  // event can expire, and the API hands out a fresh one on every read.
  const finishedId = job && isFinished(job) ? job.id : null;
  useEffect(() => {
    if (finishedId) void refresh();
  }, [finishedId, refresh]);

  useJobSocket({ jobId, active, onUpdate: setJob, onResync: () => void refresh(), onConnection: setSocketUp });

  useEffect(() => {
    if (!active || socketUp) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [active, socketUp, refresh]);

  const start = useCallback((avatarId: string, script: string) => {
    setStarting(true);
    setError(null);
    void startAvatarVideo({ avatarId, script, idempotencyKey: attemptKey.current })
      .then((result) => {
        if (result.status === "ok") setJob(result.job);
        else if (result.status === "unconfigured") setUnconfigured(true);
        else setError(result.message);
      })
      .catch(() => setError("Could not start the video. Try again."))
      .finally(() => setStarting(false));
  }, []);

  const reset = useCallback(() => {
    attemptKey.current = crypto.randomUUID();
    setJob(null);
    setError(null);
  }, []);

  return { job, starting, error, unconfigured, start, reset };
}
