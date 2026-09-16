"use client";

import { CircleAlert, Sparkles } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import { useTwinVideo } from "../hooks/use-twin-video";
import { type TwinSummary } from "../delete-actions";
import { type TwinVideoReadiness } from "../video-actions";
import { Spinner } from "@/components/ui/spinner";

/**
 * The thing a trained twin is for.
 *
 * Training ended in a green tick and nothing else: somebody could record
 * themselves, wait, be told their avatar was ready, and have no way to use it.
 * This is the missing half, and it sits directly under the library rather than
 * behind a link, because "ready" and "use it" are one thought.
 *
 * Unavailability is stated rather than hidden. A disabled control with no
 * reason is indistinguishable from a broken one, and both of the reasons this
 * can be closed, no provider key and no agreed price, are ours rather than the
 * person's to fix.
 */

/** Matches the edge function's ceiling. Shown, so nobody writes past it and finds out on submit. */
const MAX_SCRIPT = 1500;

/** Why the panel is closed, said in the panel's own place rather than by its absence. */
function Unavailable({ children }: { children: ReactNode }): ReactNode {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-hairline bg-cloud p-4 text-sm text-ink-soft">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

export function TwinSpeak({
  twins,
  readiness,
}: {
  twins: readonly TwinSummary[];
  readiness: TwinVideoReadiness;
}): ReactNode {
  const usable = twins.filter((twin) => twin.trainingStatus === "ready");
  const [avatarId, setAvatarId] = useState(usable[0]?.id ?? "");
  const [script, setScript] = useState("");
  const clear = useCallback(() => setScript(""), []);
  const { phase, busy, start } = useTwinVideo(clear);

  // Nothing to say yet, and nothing worth a panel about it: the library above
  // is already telling this person to record one.
  if (twins.length === 0) return null;
  if (!readiness.ready) return <Unavailable>{readiness.reason}</Unavailable>;
  if (usable.length === 0) {
    return (
      <Unavailable>Your avatar is still training. This opens as soon as it is ready.</Unavailable>
    );
  }

  const tooLong = script.length > MAX_SCRIPT;
  const submittable = !busy && script.trim() !== "" && !tooLong;

  return (
    <section aria-labelledby="twin-speak-heading">
      <h3 id="twin-speak-heading" className="sr-only">
        Generate a video
      </h3>
      <p className="text-sm text-ink-soft mb-6">
        Your avatar speaks this in its own voice, and the video lands in your library.
        <br />
        <span className="font-medium text-primary">
          Cost: {readiness.cost} {readiness.cost === 1 ? "credit" : "credits"}
        </span>
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {/* Avatar Selection */}
        {usable.length > 1 ? (
          <div className="rounded-lg border border-hairline p-4 bg-cloud/50">
            <label
              htmlFor="twin-speak-avatar"
              className="block text-xs font-semibold text-ink-soft uppercase tracking-wide"
            >
              Select which avatar to use
            </label>
            <select
              id="twin-speak-avatar"
              value={avatarId}
              disabled={busy}
              onChange={(event) => setAvatarId(event.target.value)}
              className="mt-3 h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 font-medium"
            >
              {usable.map((twin) => (
                <option key={twin.id} value={twin.id}>
                  {twin.name ?? `Avatar ${twin.id.slice(0, 8)}`}
                  {twin.isDefault ? " • default" : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-soft">
              Your avatar speaks with its trained voice automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-hairline p-4 bg-cloud/50">
            <p className="text-sm font-medium text-ink">
              {usable[0]?.name ?? `Avatar ${usable[0]?.id.slice(0, 8)}`}
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Your avatar speaks with its trained voice automatically.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="twin-speak-script" className="block text-xs font-medium text-ink-soft">
            Script
          </label>
          <textarea
            id="twin-speak-script"
            value={script}
            rows={4}
            disabled={busy}
            aria-describedby="twin-speak-count"
            placeholder="Hi, I'm back with three things I learned this week..."
            onChange={(event) => setScript(event.target.value)}
            className="mt-1 w-full resize-y rounded-lg border border-hairline bg-transparent p-3 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          />
          <p
            id="twin-speak-count"
            className={`mt-1 text-xs ${tooLong ? "text-destructive" : "text-ink-soft"}`}
          >
            {script.length} of {MAX_SCRIPT} characters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!submittable}
            onClick={() => start({ avatarId, script })}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Spinner className="size-4" /> : <Sparkles className="size-4" aria-hidden />}
            {busy ? "Rendering" : "Make the video"}
          </button>

          <p role="status" aria-live="polite" className="text-sm text-ink-soft">
            {phase.kind === "starting" ? "Starting your video..." : null}
            {phase.kind === "rendering"
              ? "Rendering. You can leave this page; it will be in your library when it is done."
              : null}
            {phase.kind === "done" ? (
              <>
                Done.{" "}
                <Link
                  href={"/dashboard/library" as Route}
                  className="font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Watch it in your library
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>

        {phase.kind === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {phase.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
