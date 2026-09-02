import { CheckCircle2, CircleAlert, Loader2, Lock, ShieldCheck, Video } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type TwinSummary } from "@/features/live-avatar/delete-actions";
import { type BrandAsset } from "@/lib/assets/brand";

import { AvatarStage } from "./avatar-stage";

/**
 * The lead panel: the likeness a video is made in.
 *
 * Its state is the twin's real training status, not a percentage. There is no
 * progress number behind a HeyGen training job, so a bar filling to 100 would
 * be an animation pretending to be telemetry. The bar is full when the twin is
 * ready, indeterminate while it trains, and absent when there is nothing yet.
 */

function statusOf(twin: TwinSummary | null): {
  label: string;
  tone: string;
  icon: typeof CheckCircle2;
  done: boolean;
} {
  if (twin === null)
    return { label: "Not recorded yet", tone: "text-ink-soft", icon: CircleAlert, done: false };
  if (twin.trainingStatus === "ready")
    return { label: "Ready to use", tone: "text-success", icon: CheckCircle2, done: true };
  if (twin.trainingStatus === "failed")
    return {
      label: twin.error ?? "Training did not finish",
      tone: "text-destructive",
      icon: CircleAlert,
      done: false,
    };
  return { label: "Still training", tone: "text-ink-soft", icon: Loader2, done: false };
}

export function AvatarPanel({
  twins,
  photo,
}: {
  twins: readonly TwinSummary[];
  photo: BrandAsset | null;
}): ReactNode {
  const primary = twins.find((twin) => twin.isDefault) ?? twins[0] ?? null;
  const status = statusOf(primary);

  return (
    <section
      aria-labelledby="avatar-heading"
      className="relative isolate min-h-[360px] overflow-hidden rounded-2xl border border-hairline bg-paper"
    >
      <AvatarStage photoUrl={photo?.url ?? null} />

      <div className="relative z-10 flex h-full max-w-[62%] flex-col p-6 sm:p-7">
        {primary !== null ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-success">
            <ShieldCheck className="size-3" aria-hidden />
            {primary.isDefault ? "Primary avatar" : "Recorded"}
          </span>
        ) : null}

        <h2 id="avatar-heading" className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-ink">
          {primary?.name ?? "Your digital twin"}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          A recording of you, trained once, so a video can be made in your own face and voice.
        </p>

        <dl className="mt-6 max-w-xs">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-ink-soft">Status</dt>
            <dd className={`flex items-center gap-1.5 text-sm font-medium ${status.tone}`}>
              <status.icon
                className={`size-3.5 ${primary?.trainingStatus === "pending" ? "animate-spin" : ""}`}
                aria-hidden
              />
              {status.label}
            </dd>
          </div>
          {primary !== null ? (
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-cloud"
              role="img"
              aria-label={status.label}
            >
              <div
                className={
                  status.done
                    ? "h-full w-full rounded-full bg-primary"
                    : "h-full w-1/3 rounded-full bg-primary/60 motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]"
                }
              />
            </div>
          ) : null}
        </dl>

        <Link
          href={"/dashboard/avatar/new" as Route}
          className="mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Video className="size-4" aria-hidden />
          {primary === null ? "Record your avatar" : "Record new take"}
        </Link>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your recording is private to your account, and deleting it removes it here and at the
          provider.
        </p>
      </div>
    </section>
  );
}
