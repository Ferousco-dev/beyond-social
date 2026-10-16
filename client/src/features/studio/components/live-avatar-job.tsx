"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { adoptVideo, sceneStatus } from "../assist-actions";
import { placeGeneratedVideo } from "../lib/place-generated";
import { useJobSocket } from "@/lib/go-api/use-job-socket";
import { type JobView } from "@/lib/go-api/jobs";

const WORDS_PER_SECOND = 2.5;

function estimateSeconds(script: string): number {
  return Math.max(3, Math.round(script.trim().split(/\s+/).length / WORDS_PER_SECOND));
}

/** Watches an avatar generation while the editor remains usable, then places it on the timeline. */
export function LiveAvatarJob({ jobId, script }: { jobId: string; script: string }) {
  const [message, setMessage] = useState("Generating your avatar video…");
  const [finished, setFinished] = useState(false);
  const adopting = useRef(false);

  const finish = useCallback(async (): Promise<void> => {
    if (adopting.current) return;
    adopting.current = true;
    const result = await sceneStatus(jobId);
    if (result.state === "failed") {
      setFinished(true);
      setMessage(result.message);
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
      return;
    }
    const placed = placeGeneratedVideo(copied.mediaId, result.seconds ?? estimateSeconds(script), "Avatar video");
    setFinished(true);
    setMessage(placed.error ?? "Avatar video added to your timeline.");
  }, [jobId, script]);

  const onUpdate = useCallback((job: JobView): void => {
    if (job.status === "failed") {
      setFinished(true);
      setMessage(job.error ?? "This avatar video could not be generated.");
      return;
    }
    if (job.status === "completed") {
      void finish();
      return;
    }
    setMessage(job.stage ? `${job.stage}…` : "Generating your avatar video…");
  }, [finish]);

  const resync = useCallback((): void => {
    void finish();
  }, [finish]);

  useJobSocket({ jobId, active: !finished, onUpdate, onResync: resync, onConnection: () => undefined });

  return (
    <p role="status" className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-2 text-xs text-ink shadow-card">
      {!finished ? <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      <span>{message}</span>
    </p>
  );
}
