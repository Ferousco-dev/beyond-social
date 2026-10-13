"use client";

import { Spinner } from "@/components/ui/spinner";
import { type JobView } from "@/lib/go-api/jobs";

const STAGE_LABEL: Readonly<Record<string, string>> = {
  submitting: "Sending to the generator",
  generating: "Generating your video",
};

export function VideoStatus({ job, onAgain }: { job: JobView; onAgain: () => void }) {
  if (job.status === "failed") {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-xs text-destructive">
          {job.error ?? "The video could not be generated."}
        </p>
        <button
          type="button"
          onClick={onAgain}
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
          className="aspect-[9/16] w-full max-w-xs rounded-lg border border-hairline bg-black"
        />
        <div className="flex gap-4 text-[13px]">
          <a
            href={job.resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Open the video
          </a>
          <button type="button" onClick={onAgain} className="text-ink-soft transition-colors hover:text-ink">
            Make another
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] text-ink">
        <Spinner className="size-3.5" />
        {job.stage ? (STAGE_LABEL[job.stage] ?? "Working") : "Queued"}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={job.progress}
        aria-label="Video progress"
        className="h-1 overflow-hidden rounded-full bg-hairline"
      >
        <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${job.progress}%` }} />
      </div>
    </div>
  );
}
