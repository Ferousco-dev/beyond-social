"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { adoptVideo, sceneStatus } from "../assist-actions";
import { placeGeneratedVideo } from "../lib/place-generated";
import { useJobSocket } from "@/lib/go-api/use-job-socket";
import { type JobView } from "@/lib/go-api/jobs";
import { type ProjectGeneration } from "../core/types.ts";
import { useStudio } from "../store/editor-store";

const WORDS_PER_SECOND = 2.5;

function estimateSeconds(script: string): number {
  return Math.max(3, Math.round(script.trim().split(/\s+/).length / WORDS_PER_SECOND));
}

/** Watches an avatar generation while the editor remains usable, then places it on the timeline. */
export function LiveAvatarJob({ generation }: { generation: ProjectGeneration }) {
  const { jobId, script, state: initialState } = generation;
  const initialMessage = initialState === "completed"
    ? "Your video is on this project's timeline."
    : initialState === "failed"
      ? generation.message ?? "This video could not be generated."
      : "Generation is running. You can leave and reopen this project.";
  const [message, setMessage] = useState(initialMessage);
  const [finished, setFinished] = useState(initialState !== "running");
  const adopting = useRef(false);

  const saveGenerationState = useCallback((state: ProjectGeneration["state"], detail?: string): void => {
    useStudio.getState().edit((project) => {
      if (project.generation?.jobId !== jobId) return { ok: true, value: project };
      return {
        ok: true,
        value: {
          ...project,
          generation: { ...project.generation, state, message: detail },
        },
      };
    });
  }, [jobId]);

  const finish = useCallback(async (): Promise<void> => {
    if (adopting.current) return;
    adopting.current = true;
    const result = await sceneStatus(jobId);
    if (result.state === "failed") {
      setFinished(true);
      setMessage(result.message);
      saveGenerationState("failed", result.message);
      return;
    }
    if (result.state !== "done") {
      adopting.current = false;
      return;
    }
    setMessage("Adding the finished video to your timeline…");
    const copied = await adoptVideo(jobId);
    if (!copied.ok) {
      setFinished(true);
      setMessage(copied.message);
      saveGenerationState("failed", copied.message);
      return;
    }
    const placed = placeGeneratedVideo(copied.mediaId, result.seconds ?? estimateSeconds(script), "Avatar video");
    setFinished(true);
    setMessage(placed.error ?? "Avatar video added to your timeline.");
    saveGenerationState(placed.error ? "failed" : "completed", placed.error ?? undefined);
  }, [jobId, saveGenerationState, script]);

  const onUpdate = useCallback((job: JobView): void => {
    if (job.status === "failed") {
      setFinished(true);
      const detail = job.error ?? "This video could not be generated.";
      setMessage(detail);
      saveGenerationState("failed", detail);
      return;
    }
    if (job.status === "completed") {
      void finish();
      return;
    }
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
      </div>
    </section>
  );
}
