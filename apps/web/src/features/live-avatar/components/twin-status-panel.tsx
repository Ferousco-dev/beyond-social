"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

export type Phase = "recording" | "uploading" | "training" | "ready" | "failed";

/**
 * What is happening to a recording after it stops being a recording.
 *
 * Every state says what it is waiting on rather than spinning silently. The
 * training wait in particular is minutes rather than seconds and has nothing to
 * show for itself, so the copy carries it: a spinner with no sentence beside it
 * is indistinguishable from a page that has stopped working.
 *
 * The unconfigured case is not treated as a separate state on purpose. From the
 * person's side, "the provider has not been connected yet" and "the provider is
 * still working" are the same fact, which is that their avatar is not ready and
 * they did nothing wrong.
 */
export function TwinStatusPanel({
  phase,
  message,
  onRetry,
}: {
  phase: Exclude<Phase, "recording">;
  message: string | null;
  onRetry: () => void;
}): ReactNode {
  const copy: Record<Exclude<Phase, "recording">, { title: string; body: string }> = {
    uploading: {
      title: "Saving your recording",
      body: "Keep this page open. This is the only copy until it lands.",
    },
    training: {
      title: "Building your avatar",
      body: "Your recording is in. Learning a face and a voice takes a few minutes, and you can leave this page: it carries on without you and will be waiting when you come back.",
    },
    ready: {
      title: "Your avatar is ready",
      body: "Every video you make from here can be in your own face and voice.",
    },
    failed: {
      title: "That did not finish",
      body: "Nothing was lost that you need to redo by hand, and recording again is safe.",
    },
  };

  const { title, body } = copy[phase];
  const working = phase === "uploading" || phase === "training";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <p className="flex justify-center" aria-hidden>
        {working ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : phase === "ready" ? (
          <CheckCircle2 className="size-8 text-success" />
        ) : (
          <CircleAlert className="size-8 text-destructive" />
        )}
      </p>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft" role="status">
        {body}
      </p>

      {/* The provider's own words, when there are any. A person who cannot see
          the reason cannot tell a re-recordable problem from a permanent one. */}
      {phase === "failed" && message ? (
        <p className="mt-4 rounded-lg border border-hairline bg-cloud/60 px-3 py-2 text-left text-xs text-ink-soft">
          {message}
        </p>
      ) : null}

      {phase === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Record again
        </button>
      ) : null}
    </div>
  );
}
