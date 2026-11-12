"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { waitForJob } from "@/lib/go-api/wait-for-job";

import { readAnalysis, startAnalysis, type AnalysisContent, type AnalysisResult } from "../actions";
import { APPROVED_SCRIPT_KEY } from "../approved-script";
import { BackButton } from "./back-button";
import { ScriptEditor } from "./script-editor";


const MAX_ANALYSIS_WAIT_MS = 8 * 60 * 1000;

/** Phase 2: watch the analysis land, then shape the suggested script. */
export function AnalysisView({
  url,
  mediaId,
  context,
  resumeJobId,
  onBack,
}: {
  url: string;
  /** A previewed link's stored copy, analysed in place of downloading it again. */
  mediaId?: string;
  context: string;
  /** An analysis job already in progress (e.g. opened from a sidebar draft): poll it instead of starting a new one. */
  resumeJobId?: string;
  onBack: () => void;
}) {
  const [state, setState] = useState<string>("queued");
  const [stage, setStage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const apply = (result: AnalysisResult): void => {
      if (cancelled || result.status !== "ok") return;
      setState(result.job.state);
      setStage(result.job.stage);
      setProgress(result.job.progress);
      if (result.job.analysis) setAnalysis(result.job.analysis);
      else if (result.job.state === "failed") setError(result.job.error ?? "The analysis failed. No video was generated.");
    };

    // Watches over the API's WebSocket instead of a plain timer: a backgrounded
    // tab can have its timers paused for a long time, but a push still lands
    // once the connection resumes, and the 15s backstop catches a missed one.
    const watch = async (id: string) => {
      const result = await waitForJob({
        jobId: id,
        check: () => readAnalysis(id),
        isDone: (r) => r.status !== "ok" || r.job.analysis !== null || r.job.state === "failed",
        timeoutMs: MAX_ANALYSIS_WAIT_MS,
        alive: () => !cancelled,
      });
      if (result === null) {
        if (!cancelled) setError("The analysis is taking too long. No video was generated. Go back and try again.");
        return;
      }
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "Analysis is not available right now." : result.message);
        return;
      }
      apply(result);
    };

    if (resumeJobId) {
      void readAnalysis(resumeJobId).then((result) => {
        if (cancelled) return;
        if (result.status !== "ok") {
          setError(result.status === "unconfigured" ? "Analysis is not available right now." : result.message);
          return;
        }
        apply(result);
        if (!result.job.analysis && result.job.state !== "failed") void watch(resumeJobId);
      });
      return () => {
        cancelled = true;
      };
    }

    void startAnalysis({ url, mediaId, idempotencyKey: crypto.randomUUID() })
      .then((result) => {
        if (cancelled) return;
        if (result.status !== "ok") {
          setError(result.status === "unconfigured" ? "Analysis is not available right now." : result.message);
          return;
        }
        apply(result);
        if (!result.job.analysis) void watch(result.job.id);
      })
      .catch(() => {
        if (!cancelled) setError("The analysis did not start. Go back and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [url, mediaId, resumeJobId]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <BackButton onBack={onBack} />
      </div>
    );
  }

  if (!analysis) {
    const status = state === "queued"
      ? "Waiting for analysis to start…"
      : stage === "fetching"
        ? "Fetching the video…"
        : stage === "watching"
          ? "Analyzing the video and audio…"
          : "Analysis is running…";
    return (
      <div className="flex flex-col items-start gap-3" aria-live="polite">
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner className="size-4 text-primary" />
          {status}
        </p>
        {state === "running" ? (
          <div role="progressbar" aria-label="Video analysis progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 w-full overflow-hidden rounded-full bg-cloud">
            <span className="block h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <BackButton onBack={onBack} />
      </div>
    );
  }

  return (
    <ScriptEditor analysis={analysis} context={context} approved={approved} onApprove={(script) => {
      window.sessionStorage.setItem(APPROVED_SCRIPT_KEY, JSON.stringify(script));
      setApproved(true);
    }} onBack={onBack} />
  );
}
