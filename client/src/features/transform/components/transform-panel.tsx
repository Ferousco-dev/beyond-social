"use client";

import { useId, useState } from "react";
import { Wand2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import { useVideoTransform } from "../hooks/use-video-transform";
import { isFinished, type JobView } from "../types";

const STAGE_LABEL: Readonly<Record<string, string>> = {
  preparing: "Preparing the video",
  uploading: "Uploading",
  submitting: "Sending to the generator",
  generating: "Generating",
};

const PROMPT_LIMIT = 2000;

/**
 * Turning the selected video into a new one.
 *
 * The prompt is optional; without one the generator restyles the video and
 * keeps its subject and motion. Progress is shown as the backend reports it,
 * and the result appears only once the provider has confirmed it is finished.
 */
export function TransformPanel({ videoId }: { videoId: string }) {
  const promptId = useId();
  const [prompt, setPrompt] = useState("");
  const { job, starting, error, unconfigured, start, reset } = useVideoTransform(videoId);

  if (unconfigured) return null;

  const busy = starting || (job !== null && !isFinished(job));

  return (
    <section aria-label="Transform this video" className="flex flex-col gap-2 border-t border-hairline pt-4">
      <label htmlFor={promptId} className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
        Transform this video
      </label>
      <textarea
        id={promptId}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        maxLength={PROMPT_LIMIT}
        rows={3}
        disabled={busy || job !== null}
        placeholder="Describe the change, or leave blank to restyle it"
        className="w-full resize-none rounded-lg border border-hairline bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      />

      {job === null ? (
        <button
          type="button"
          onClick={() => start(prompt)}
          disabled={starting}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {starting ? <Spinner className="size-3.5" /> : <Wand2 className="size-3.5" aria-hidden />}
          {starting ? "Starting" : "Transform video"}
        </button>
      ) : (
        <JobStatus job={job} onRetry={reset} />
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function JobStatus({ job, onRetry }: { job: JobView; onRetry: () => void }) {
  if (job.status === "failed") {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-xs text-destructive">
          {job.error ?? "The video could not be generated."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-hairline px-4 text-[13px] font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  if (job.status === "completed" && job.resultUrl) {
    return (
      <div className="flex flex-col gap-2">
        <video
          src={job.resultUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-[9/16] w-full rounded-lg border border-hairline bg-black"
        />
        <a
          href={job.resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Open the video
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="text-center text-[13px] text-ink-soft transition-colors hover:text-ink"
        >
          Transform another way
        </button>
      </div>
    );
  }

  const label = job.stage ? (STAGE_LABEL[job.stage] ?? "Working") : "Queued";
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] text-ink">
        <Spinner className="size-3.5" />
        {label}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.progress}
        aria-label="Transformation progress"
        className="h-1 overflow-hidden rounded-full bg-hairline"
      >
        <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${job.progress}%` }} />
      </div>
      <p className="text-[11px] text-ink-soft">This usually takes a few minutes. You can leave this open.</p>
    </div>
  );
}
