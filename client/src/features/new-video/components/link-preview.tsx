"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { waitForJob } from "@/lib/go-api/wait-for-job";

import { readLinkPreview, startLinkPreview, type LinkPreviewResult } from "../actions";

const MAX_WAIT_MS = 4 * 60 * 1000;
const NOTES_MAX = 1000;

type Preview = Extract<LinkPreviewResult, { status: "ok" }>["job"];

/**
 * Step between pasting a link and analysing it: the video is fetched and shown,
 * and nothing reaches the model until the person approves, with any notes of
 * their own to steer it.
 */
export function LinkPreview({
  url,
  resumeJobId,
  onApprove,
  onBack,
}: {
  url: string;
  /** A fetch job already in progress (e.g. opened from a sidebar draft): poll it instead of starting a new one. */
  resumeJobId?: string;
  onApprove: (choice: { url: string; mediaId?: string; notes: string }) => void;
  onBack: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    const apply = (result: LinkPreviewResult): Preview | null => {
      if (cancelled) return null;
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "Previews are not available right now." : result.message);
        return null;
      }
      if (result.job.state === "failed") {
        setError(result.job.error ?? "That video could not be opened.");
        return null;
      }
      setPreview(result.job);
      return result.job;
    };

    // Watches over the API's WebSocket instead of a plain timer: a backgrounded
    // tab can have its timers paused for a long time, but a push still lands
    // once the connection resumes, and the 15s backstop catches a missed one.
    const run = async (jobId: string) => {
      const result = await waitForJob({
        jobId,
        check: () => readLinkPreview(jobId),
        isDone: (r) => r.status !== "ok" || r.job.state === "completed" || r.job.state === "failed",
        timeoutMs: MAX_WAIT_MS,
        alive: () => !cancelled,
      });
      if (result === null) {
        if (!cancelled) setError("Fetching the video is taking too long. Go back and try again.");
        return;
      }
      apply(result);
    };

    if (resumeJobId) {
      void run(resumeJobId);
      return () => {
        cancelled = true;
      };
    }

    void startLinkPreview({ url, idempotencyKey: crypto.randomUUID() })
      .then((result) => {
        const job = apply(result);
        if (job && job.state !== "completed" && job.state !== "failed") void run(job.id);
      })
      .catch(() => !cancelled && setError("Something went wrong while fetching the video."));

    return () => {
      cancelled = true;
    };
  }, [url, resumeJobId]);

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <BackButton onBack={onBack} />
      </div>
    );
  }

  if (preview?.state !== "completed") {
    return (
      <div className="flex flex-col items-start gap-3" aria-live="polite">
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner className="size-4 text-primary" />
          Fetching the video so you can watch it first…
        </p>
        <BackButton onBack={onBack} />
      </div>
    );
  }

  const canonicalUrl = preview.url ?? url;
  return (
    <div className="flex flex-col gap-4">
      {preview.videoUrl ? (
        <video
          src={preview.videoUrl}
          controls
          playsInline
          preload="metadata"
          aria-label="The video you pasted"
          className="mx-auto aspect-[9/16] max-h-[60vh] w-full max-w-[calc(60vh*9/16)] rounded-lg border border-hairline bg-black object-contain"
        />
      ) : (
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
        >
          Watch it on YouTube
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Anything to add? (optional)
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, NOTES_MAX))}
          rows={3}
          placeholder="For example: make it about my coffee shop, keep the fast cuts."
          className="w-full rounded-[10px] border border-hairline bg-paper p-3 text-sm font-normal text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
        <span className="text-xs font-normal text-ink-soft">
          Nothing is sent to the AI until you press Analyze video.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onApprove({ url: canonicalUrl, mediaId: preview.mediaId ?? undefined, notes: notes.trim() })}
          className="inline-flex h-11 cursor-pointer items-center rounded-[10px] bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Analyze video
        </button>
        <BackButton onBack={onBack} />
      </div>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="cursor-pointer text-sm text-primary underline underline-offset-2 hover:opacity-80">
      Back
    </button>
  );
}
