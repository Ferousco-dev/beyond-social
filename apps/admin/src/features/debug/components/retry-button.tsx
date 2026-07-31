"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type ReactNode } from "react";

import { retryPostAction } from "../actions";
import type { RetryResult } from "../types";

/**
 * Puts one post back in front of the scheduler.
 *
 * The reason field is not decoration: it lands in the audit row, and a requeue
 * nobody can explain later is the kind of change this console exists to prevent.
 * The button never publishes anything itself, so the worst case of a mistaken
 * click is one extra pass through the claim, which refuses posts that already
 * reached the platform.
 */
export function RetryButton({ postId, platform }: { postId: string; platform: string }): ReactNode {
  const [state, formAction] = useActionState<RetryResult | null, FormData>(retryPostAction, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-center gap-2">
        <label htmlFor={`reason-${postId}`} className="sr-only">
          Reason for retrying this {platform} post
        </label>
        <input
          id={`reason-${postId}`}
          name="reason"
          type="text"
          maxLength={200}
          placeholder="Reason"
          className="h-8 w-40 rounded-lg border border-hairline bg-paper px-2.5 text-xs text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <Submit />
      </div>
      {state ? (
        <p
          role="status"
          className={`max-w-56 text-right text-xs ${
            state.status === "ok" ? "text-ink-soft" : "text-destructive"
          }`}
        >
          {state.status === "ok"
            ? state.mayHavePosted
              ? "Requeued. A previous attempt had already started, so check the account."
              : "Requeued. The scheduler picks it up within a minute."
            : state.message}
        </p>
      ) : null}
    </form>
  );
}

function Submit(): ReactNode {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-hairline px-2.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Requeuing" : "Retry"}
    </button>
  );
}
