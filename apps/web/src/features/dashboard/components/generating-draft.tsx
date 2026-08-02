"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";

/**
 * The placeholder shown while a render is in flight.
 *
 * This used to cycle "Creating, Sketching, Storyboarding, Rendering, Adding
 * captions" on a 1.2 second timer, looping back to the start forever. None of
 * those stages exist: the provider reports a single pending flag and nothing
 * else, there is no storyboard step, and nothing adds captions. It also kept
 * animating confidently through a render that had already finished, which is
 * the exact moment a progress indicator has to be trustworthy.
 *
 * Elapsed time is the one honest signal available, so that is what is shown. A
 * typical render lands around seventy seconds, which is what makes the number
 * meaningful rather than decorative.
 */

/** Past this a render is slower than usual, and saying so beats a bare number. */
const SLOW_AFTER_SECONDS = 150;

interface GeneratingDraftProps {
  /** Stops the waiting. The render itself cannot be stopped, so this is not undo. */
  onCancel?: () => void;
  /** When the render actually started, ISO 8601. Absent until it is persisted. */
  startedAt?: string;
}

export function GeneratingDraft({ onCancel, startedAt }: GeneratingDraftProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    /*
     * Counted from when the turn was recorded, falling back to mount for a
     * draft that has not been persisted yet.
     *
     * Counting from mount alone meant leaving the page and coming back
     * restarted the clock, so a render two minutes in claimed to have just
     * started. The number is the only honest signal this placeholder has, and
     * one that resets is worse than none.
     */
    const parsed = startedAt ? Date.parse(startedAt) : Number.NaN;
    const origin = Number.isNaN(parsed) ? Date.now() : parsed;

    const tick = () =>
      // Clamped at zero: the timestamp comes from the database, and a clock
      // even slightly ahead of the browser would otherwise show a negative age.
      setSeconds(Math.max(0, Math.floor((Date.now() - origin) / 1000)));

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const slow = seconds >= SLOW_AFTER_SECONDS;

  return (
    <div
      className="relative mt-3 aspect-[9/16] w-56 overflow-hidden rounded-xl border border-hairline bg-paper"
      role="status"
      // Announced once rather than on every tick: a live counter would make a
      // screen reader read the seconds aloud sixty times a minute.
      aria-label="Generating your video"
    >
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(var(--ink-soft)_1.1px,transparent_1.1px)] [background-size:15px_15px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)] motion-safe:animate-pulse" />
      <div className="absolute left-3 top-3">
        <Logo showWordmark={false} />
      </div>
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1">
        <span className="text-shimmer text-sm font-medium">
          {slow ? "Still generating" : "Generating"}
        </span>
        <span aria-hidden className="text-xs tabular-nums text-ink-soft">
          {formatElapsed(seconds)}
        </span>
        {slow ? (
          <span className="px-4 text-center text-xs text-ink-soft">
            Longer than usual, but still running.
          </span>
        ) : null}
        {onCancel ? (
          // Deliberately not called "Cancel". The render cannot be stopped and
          // is charged either way, so offering cancel would promise an undo
          // that does not exist.
          <button
            type="button"
            onClick={onCancel}
            className="mt-1 cursor-pointer rounded-full px-3 py-1 text-xs text-ink-soft underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Stop waiting
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}
