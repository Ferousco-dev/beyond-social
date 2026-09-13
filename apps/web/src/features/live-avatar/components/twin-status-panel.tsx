"use client";

import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";

export type Phase = "recording" | "uploading" | "consent" | "training" | "ready" | "failed";

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
  consentUrl,
  onRefreshConsent,
  onCheckNow,
  checkingNow,
  checkNowMessage,
}: {
  phase: Exclude<Phase, "recording">;
  message: string | null;
  onRetry: () => void;
  consentUrl?: string | null;
  onRefreshConsent?: () => void;
  /** Offered while training only: asks for this person's own rows ahead of the next background tick. */
  onCheckNow?: () => void;
  checkingNow?: boolean;
  checkNowMessage?: string | null;
}): ReactNode {
  const copy: Record<Exclude<Phase, "recording">, { title: string; body: string }> = {
    uploading: {
      title: "Saving your recording",
      body: "Keep this page open. This is the only copy until it lands.",
    },
    consent: {
      title: "Complete HeyGen setup",
      body: "HeyGen needs you to record consent live on its hosted page. This is available to self-service accounts and replaces the Enterprise-only prerecorded consent upload.",
    },
    training: {
      title: "Processing avatar",
      body: "Your recording and HeyGen setup are in progress. Learning a face and a voice takes a few minutes, and you can leave this page: it carries on without you and will be waiting when you come back. Still processing after a while means we are still checking HeyGen in the background, not that it stopped.",
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
          <Spinner className="size-8 text-primary" />
        ) : phase === "ready" ? (
          <CheckCircle2 className="size-8 text-success" />
        ) : phase === "consent" ? (
          <ExternalLink className="size-8 text-primary" />
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

      {phase === "consent" ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          {consentUrl ? (
            <a
              href={consentUrl}
              className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Continue to HeyGen
            </a>
          ) : null}
          {onRefreshConsent ? (
            <button
              type="button"
              onClick={onRefreshConsent}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Get a new HeyGen setup link
            </button>
          ) : null}
        </div>
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

      {/*
       * A way out of watching a spinner. The page already re-reads the row
       * every few seconds, which only shows what the background schedule has
       * learned; this asks the schedule's own pollers to look at this
       * person's rows now. Budgeted per person behind the action, so the
       * button being hammered costs patience rather than provider quota.
       */}
      {phase === "training" && onCheckNow ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={onCheckNow}
            disabled={checkingNow}
            className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            {checkingNow ? "Checking HeyGen…" : "Check now"}
          </button>
          {checkNowMessage ? (
            <p className="mt-2 text-xs text-ink-soft" role="status">
              {checkNowMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
