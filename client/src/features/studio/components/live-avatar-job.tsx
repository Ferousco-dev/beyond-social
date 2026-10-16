"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { adoptVideo, quoteScene, sceneStatus, startScene } from "../assist-actions";
import { quoteAvatarVideoScript, startAvatarVideo } from "@/features/live-avatar/avatar-video-actions";
import { createLiveAvatar } from "@/features/live-avatar-flow/actions";
import { placeGeneratedVideo } from "../lib/place-generated";
import { useJobSocket } from "@/lib/go-api/use-job-socket";
import { type JobView } from "@/lib/go-api/jobs";
import { type ProjectGeneration } from "../core/types.ts";
import { useStudio } from "../store/editor-store";

const WORDS_PER_SECOND = 2.5;

function estimateSeconds(script: string): number {
  return Math.max(3, Math.min(15, Math.round(script.trim().split(/\s+/).length / WORDS_PER_SECOND)));
}

/** Watches an avatar generation while the editor remains usable, then places it on the timeline. */
export function LiveAvatarJob({ generation }: { generation: ProjectGeneration }) {
  const { script, state: initialState } = generation;
  const [jobId, setJobId] = useState(generation.jobId);
  const initialMessage = initialState === "completed"
    ? "Your video is on this project's timeline."
    : initialState === "failed"
      ? generation.message ?? "This video could not be generated."
      : "Generation is running. You can leave and reopen this project.";
  const [message, setMessage] = useState(initialMessage);
  const [finished, setFinished] = useState(initialState !== "running");
  const [failed, setFailed] = useState(initialState === "failed");
  const [retrying, setRetrying] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const [retryCredits, setRetryCredits] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const adopting = useRef(false);

  const saveGenerationState = useCallback((state: ProjectGeneration["state"], detail?: string, nextJobId = jobId, expectedJobId = jobId): void => {
    useStudio.getState().edit((project) => {
      if (project.generation?.jobId !== expectedJobId) return { ok: true, value: project };
      return {
        ok: true,
        value: {
          ...project,
          generation: { ...project.generation, jobId: nextJobId, state, message: detail },
        },
      };
    });
  }, [jobId]);

  const finish = useCallback(async (): Promise<void> => {
    if (adopting.current) return;
    adopting.current = true;
    const result = await sceneStatus(jobId);
    if (result.state === "failed" || result.state === "error") {
      setFinished(true);
      setFailed(true);
      setMessage(result.message);
      saveGenerationState("failed", result.message);
      adopting.current = false;
      return;
    }
    if (result.state !== "done") {
      setFailed(false);
      adopting.current = false;
      return;
    }
    setMessage("Adding the finished video to your timeline…");
    const copied = await adoptVideo(jobId);
    if (!copied.ok) {
      setFinished(true);
      setFailed(true);
      setMessage(copied.message);
      saveGenerationState("failed", copied.message);
      adopting.current = false;
      return;
    }
    const placed = placeGeneratedVideo(copied.mediaId, result.seconds ?? estimateSeconds(script), "Avatar video");
    setFinished(true);
    setFailed(Boolean(placed.error));
    setMessage(placed.error ?? "Avatar video added to your timeline.");
    saveGenerationState(placed.error ? "failed" : "completed", placed.error ?? undefined);
  }, [jobId, saveGenerationState, script]);

  const onUpdate = useCallback((job: JobView): void => {
    if (job.status === "failed") {
      setFinished(true);
      setFailed(true);
      const detail = job.error ?? "This video could not be generated.";
      setMessage(detail);
      saveGenerationState("failed", detail);
      return;
    }
    if (job.status === "completed") {
      void finish();
      return;
    }
    setFailed(false);
    setMessage(job.stage ? `${job.stage}…` : "Generating your avatar video…");
  }, [finish, saveGenerationState]);

  const resync = useCallback((): void => {
    void finish();
  }, [finish]);

  useJobSocket({ jobId, active: !finished, onUpdate, onResync: resync, onConnection: () => undefined });

  useEffect(() => {
    if (finished) return;
    void finish();
    const interval = setInterval(() => void finish(), 3_000);
    return () => clearInterval(interval);
  }, [finish, finished]);

  async function prepareRetry(): Promise<void> {
    setRetrying(true);
    setRetryError(null);
    try {
      const current = await sceneStatus(jobId);
      if (current.state === "error") {
        setRetryError(current.message);
        return;
      }
      if (current.state === "done") {
        adopting.current = false;
        setFinished(false);
        setFailed(false);
        setMessage("The video is already generated. Retrying the editor import…");
        void finish();
        return;
      }
      if (current.state === "working") {
        setFinished(false);
        setFailed(false);
        setMessage("This generation is still running. Checking again…");
        return;
      }

      const cost = (generation.generator === "avatar" && generation.avatarId)
        || (generation.generator === "live-avatar" && generation.groupId && generation.voiceId)
        ? await quoteAvatarVideoScript(script)
        : await quoteScene(generation.seconds ?? estimateSeconds(script));
      if (cost === null) {
        setRetryError("Could not check the retry cost. Try again in a moment.");
        return;
      }
      setRetryCredits(cost);
      setConfirmRetry(true);
    } catch {
      setRetryError("Could not check this generation. Try again in a moment.");
    } finally {
      setRetrying(false);
    }
  }

  async function retryGeneration(): Promise<void> {
    setRetrying(true);
    setRetryError(null);
    setConfirmRetry(false);
    try {
      const oldJobId = jobId;
      let nextJobId: string;
      if (generation.generator === "live-avatar" && generation.groupId && generation.voiceId) {
        const result = await createLiveAvatar({
          groupId: generation.groupId,
          voiceId: generation.voiceId,
          script,
          prompt: generation.direction ?? "",
          idempotencyKey: crypto.randomUUID(),
        });
        if (result.status !== "ok") {
          setRetryError(result.status === "unconfigured" ? "Avatar generation is not available right now." : result.message);
          return;
        }
        nextJobId = result.job.id;
      } else if (generation.generator === "avatar" && generation.avatarId) {
        const result = await startAvatarVideo({
          avatarId: generation.avatarId,
          script,
          idempotencyKey: crypto.randomUUID(),
        });
        if (result.status !== "ok") {
          setRetryError(result.status === "unconfigured" ? "Avatar generation is not available right now." : result.message);
          return;
        }
        nextJobId = result.job.id;
      } else {
        const result = await startScene({
          prompt: script,
          seconds: generation.seconds ?? estimateSeconds(script),
          key: crypto.randomUUID(),
          aspectRatio: generation.aspectRatio ?? "9:16",
          sound: generation.sound ?? false,
          notifyEmail: generation.notifyEmail ?? false,
          ...(generation.imageMediaId ? { imageMediaId: generation.imageMediaId } : {}),
        });
        if (!result.ok) {
          setRetryError(result.message);
          return;
        }
        nextJobId = result.jobId;
      }
      setJobId(nextJobId);
      setFinished(false);
      setFailed(false);
      setMessage("Retry queued. Generation is starting…");
      saveGenerationState("running", undefined, nextJobId, oldJobId);
    } catch {
      setRetryError("Something went wrong while retrying. Your project is still here; try again.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section role="status" aria-live="polite" className="flex shrink-0 items-start gap-3 border-b border-hairline bg-paper px-4 py-3 text-ink sm:px-6">
      {initialState === "completed" || (finished && message.includes("added to your timeline")) ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      ) : initialState === "failed" || (finished && message !== "Your video is on this project's timeline.") ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none text-primary" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">Video generation</p>
        <p className="mt-0.5 break-words text-sm text-ink-soft">{message}</p>
        {failed ? (
          <div className="mt-2 flex flex-col items-start gap-2">
            {confirmRetry ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Retry generation for {retryCredits ?? "…"} credits?</span>
                <button type="button" disabled={retrying} onClick={() => void retryGeneration()} className="min-h-9 rounded-md bg-primary px-3 font-medium text-primary-foreground disabled:opacity-50">
                  {retrying ? "Retrying…" : "Confirm retry"}
                </button>
                <button type="button" disabled={retrying} onClick={() => setConfirmRetry(false)} className="min-h-9 rounded-md border border-hairline px-3 text-ink disabled:opacity-50">Cancel</button>
              </div>
            ) : (
              <button type="button" disabled={retrying} onClick={() => void prepareRetry()} className="min-h-9 rounded-md border border-hairline px-3 text-sm font-medium text-ink hover:bg-cloud disabled:opacity-50">
                {retrying ? "Checking generation…" : "Retry generation"}
              </button>
            )}
            {retryError ? <p role="alert" className="text-sm text-destructive">{retryError}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
