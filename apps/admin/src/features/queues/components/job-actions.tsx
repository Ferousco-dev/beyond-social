"use client";

import { useActionState, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { IDLE_QUEUE_ACTION, type QueueActionState } from "../action-state";
import { removeFailedJob, retryFailedJob } from "../actions";

const BUTTON =
  "inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

/**
 * Retry and remove for one failed job.
 *
 * Remove takes two clicks. Dropping a job deletes the only record of work a
 * user asked for, there is no undo, and these buttons sit in a dense table
 * where the wrong row is one pixel away.
 */
export function JobActions({ jobId }: { jobId: string }): ReactNode {
  const [retryState, retry, retrying] = useActionState(retryFailedJob, IDLE_QUEUE_ACTION);
  const [removeState, remove, removing] = useActionState(removeFailedJob, IDLE_QUEUE_ACTION);
  const [confirming, setConfirming] = useState(false);

  const busy = retrying || removing;
  const feedback = latest(retryState, removeState);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={retry}>
          <input type="hidden" name="jobId" value={jobId} />
          <button
            type="submit"
            disabled={busy}
            aria-label={`Retry job ${jobId}`}
            className={cn(BUTTON, "border-hairline text-ink hover:bg-cloud")}
          >
            {retrying ? "Retrying" : "Retry"}
          </button>
        </form>

        {confirming ? (
          <form action={remove} onSubmit={() => setConfirming(false)}>
            <input type="hidden" name="jobId" value={jobId} />
            <button
              type="submit"
              disabled={busy}
              aria-label={`Confirm removing job ${jobId}`}
              className={cn(BUTTON, "border-destructive/30 bg-destructive/10 text-destructive")}
            >
              {removing ? "Removing" : "Confirm remove"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            aria-label={`Remove job ${jobId}`}
            className={cn(BUTTON, "border-hairline text-ink-soft hover:text-destructive")}
          >
            Remove
          </button>
        )}
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn("text-xs", feedback.status === "ok" ? "text-success" : "text-destructive")}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

function latest(retry: QueueActionState, remove: QueueActionState): QueueActionState | null {
  if (remove.status !== "idle") return remove;
  if (retry.status !== "idle") return retry;
  return null;
}
