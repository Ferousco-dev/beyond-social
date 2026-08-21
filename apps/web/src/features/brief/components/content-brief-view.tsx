"use client";

import { Check, Clock, RotateCcw, Sparkles, Zap } from "lucide-react";

import { HookScoreBadge } from "@/components/ui/hook-score-badge";
import { type ContentBrief } from "@/lib/brief/schema";

/**
 * The finished brief.
 *
 * Laid out in the order it gets used: the hook first because it is the only part
 * most viewers see, then the titles, then the script as timed beats. The button
 * at the bottom is the only one, because at this point there is exactly one
 * thing worth doing with it.
 */
export function ContentBriefView({
  brief,
  onRestart,
  onUse,
}: {
  brief: ContentBrief;
  onRestart: () => void;
  onUse: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-ink">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-cloud">
            <Check className="size-4 text-ink" aria-hidden />
          </span>
          Content brief ready
        </h1>

        <button
          type="button"
          onClick={onRestart}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Start over
        </button>
      </div>

      <section className="mt-6 rounded-2xl bg-cloud p-5">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
          <Zap className="size-3.5" aria-hidden />
          Hook
        </h2>
        <p className="mt-2.5 text-lg font-semibold leading-snug text-ink">{brief.hook}</p>
        <HookScoreBadge text={brief.hook} />
      </section>

      <section className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          Title variations
        </h2>
        <ol className="mt-3 space-y-2.5">
          {brief.titles.map((title, index) => (
            <li key={title} className="flex items-center gap-3 text-sm text-ink">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-cloud text-xs tabular-nums text-ink-soft">
                {index + 1}
              </span>
              {title}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-hairline bg-paper p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          Script outline
        </h2>
        <ol className="mt-4 space-y-4">
          {brief.beats.map((beat) => (
            <li key={beat.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {beat.label} <span className="tabular-nums">({beat.timing})</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{beat.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <ul className="mt-4 flex flex-wrap gap-2">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1.5 text-xs text-ink-soft">
          <Clock className="size-3.5" aria-hidden />
          <span className="tabular-nums">{brief.durationSeconds}s</span>
        </li>
        {brief.hashtags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-cloud px-3 py-1.5 text-xs font-medium text-ink-soft"
          >
            #{tag}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onUse}
        className="mt-7 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Sparkles className="size-4" aria-hidden />
        Use this brief, set up my video
      </button>
    </div>
  );
}
