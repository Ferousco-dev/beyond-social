"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readAnalysis, startAnalysis, type AnalysisContent } from "@/features/new-video/actions";
import { waitForJob } from "@/lib/go-api/wait-for-job";


/** Where a chosen reference video waits for the form, which writes the script from it in the background. */
export const REFERENCE_KEY = "bs:reference-video";
const MAX_WAIT_MS = 8 * 60 * 1000;

export interface ReferenceRequest {
  /** The video to write a script from. Absent when an analysis already running is picked back up. */
  readonly url?: string;
  /** One key per choice, so the form opening twice cannot start the analysis, or pay for it, twice. */
  readonly key?: string;
  /** An analysis already started, for a draft reopened from the sidebar. */
  readonly jobId?: string;
}

export type ReferenceState =
  | { readonly phase: "idle" }
  | { readonly phase: "working"; readonly progress: number }
  | { readonly phase: "ready" }
  | { readonly phase: "failed"; readonly message: string };

/**
 * Writes the script from a reference video while the person fills in the rest of
 * the form, so nobody waits on a loading screen. The request is kept in storage
 * until it finishes, so a reload carries on instead of losing it.
 */
export function useReferenceScript(onReady: (analysis: AnalysisContent) => void): { state: ReferenceState; retry: () => void; dismiss: () => void } {
  const [state, setState] = useState<ReferenceState>({ phase: "idle" });
  const [attempt, setAttempt] = useState(0);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    let request: ReferenceRequest | null = null;
    try {
      const raw = window.sessionStorage.getItem(REFERENCE_KEY);
      request = raw ? (JSON.parse(raw) as ReferenceRequest) : null;
    } catch {
      request = null;
    }
    if (!request) return;
    const { url, key, jobId } = request;
    if (typeof jobId !== "string" && (typeof url !== "string" || typeof key !== "string")) return;
    let cancelled = false;
    setState({ phase: "working", progress: 0 });

    const fail = (message: string): void => {
      if (!cancelled) setState({ phase: "failed", message });
    };
    const finish = (analysis: AnalysisContent): void => {
      if (cancelled) return;
      try {
        window.sessionStorage.removeItem(REFERENCE_KEY);
      } catch {
        // Nothing to clear.
      }
      ready.current(analysis);
      setState({ phase: "ready" });
    };

    void (typeof jobId === "string" ? readAnalysis(jobId) : startAnalysis({ url: url ?? "", idempotencyKey: key ?? "" }))
      .then(async (started) => {
        if (cancelled) return;
        if (started.status !== "ok") return fail(started.status === "unconfigured" ? "Script writing is not available right now." : started.message);
        if (started.job.analysis) return finish(started.job.analysis);
        if (started.job.state === "failed") return fail(started.job.error ?? "The video could not be analysed.");
        const done = await waitForJob({
          jobId: started.job.id,
          check: async () => {
            const result = await readAnalysis(started.job.id);
            if (result.status === "ok") setState((current) => (current.phase === "working" ? { phase: "working", progress: result.job.progress } : current));
            return result;
          },
          isDone: (result) => result.status !== "ok" || result.job.analysis !== null || result.job.state === "failed",
          timeoutMs: MAX_WAIT_MS,
          alive: () => !cancelled,
        });
        if (cancelled) return;
        if (done === null) return fail("Writing the script is taking too long. Try again.");
        if (done.status !== "ok") return fail(done.status === "unconfigured" ? "Script writing is not available right now." : done.message);
        if (done.job.analysis) return finish(done.job.analysis);
        fail(done.job.error ?? "The video could not be analysed.");
      })
      .catch(() => fail("The script could not be started. Try again."));

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    try {
      const raw = window.sessionStorage.getItem(REFERENCE_KEY);
      const request = raw ? (JSON.parse(raw) as ReferenceRequest) : null;
      if (request) window.sessionStorage.setItem(REFERENCE_KEY, JSON.stringify({ ...request, key: crypto.randomUUID() }));
    } catch {
      // The same key is tried again.
    }
    setAttempt((count) => count + 1);
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.removeItem(REFERENCE_KEY);
    } catch {
      // Nothing to clear.
    }
    setState({ phase: "idle" });
  }, []);

  return { state, retry, dismiss };
}
