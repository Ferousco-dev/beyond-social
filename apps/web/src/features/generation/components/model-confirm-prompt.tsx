"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { creditWord, type ModelUpgrade } from "@/lib/generation/confirm-model";
import { cn } from "@/lib/utils";

/**
 * The costlier model, offered before a credit is spent on it.
 *
 * Two rows, both one click, both priced. The upgrade is on top because it is
 * what the brief actually asked for, and the ordinary model sits under it at
 * its own price rather than behind a "no thanks": declining is a choice between
 * two videos, not a refusal, and it should read like one.
 *
 * The balance goes underneath, because the difference between sixty credits and
 * thirty only means something next to what is left. Escape takes the cheaper
 * row, which is the answer that cannot cost anybody anything they did not mean
 * to spend.
 */

export function ModelConfirmPrompt({
  upgrade,
  onAnswer,
  disabled,
}: {
  upgrade: ModelUpgrade;
  /** True to spend the extra, false to run the everyday model. */
  onAnswer: (accepted: boolean) => void;
  disabled: boolean;
}): ReactNode {
  const cardRef = useRef<HTMLDivElement>(null);
  const headingId = "model-confirm-heading";

  // Focus moves to the card, so somebody on a keyboard or a screen reader is
  // standing on the question rather than wherever the composer left them.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || disabled) return;
    event.preventDefault();
    onAnswer(false);
  }

  const row =
    "flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      // The card is the keyboard surface, focusable without being a tab stop
      // that does nothing: the two buttons inside it are the real stops.
      ref={cardRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
      className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card outline-none"
    >
      <div className="flex items-start gap-3 px-5 pb-4 pt-5">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-ink-soft">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Costs more than usual
          </p>
          <h2 id={headingId} className="mt-1.5 text-lg font-semibold leading-snug text-ink">
            {upgrade.reason}
          </h2>
        </div>
      </div>

      <ul className="border-t border-hairline">
        <li className="border-b border-hairline">
          <button type="button" disabled={disabled} onClick={() => onAnswer(true)} className={row}>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-ink">Use it</span>
              <span className="block text-sm text-ink-soft">
                The model that can do what you asked for
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-semibold tabular-nums text-primary-foreground">
              {creditWord(upgrade.creditCost)}
            </span>
          </button>
        </li>

        <li className="border-b border-hairline">
          <button type="button" disabled={disabled} onClick={() => onAnswer(false)} className={row}>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-ink">Use the usual model</span>
              <span className="block text-sm text-ink-soft">
                Makes the video from your brief, without that
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-cloud px-3 py-1 text-sm font-semibold tabular-nums text-ink-soft">
              {creditWord(upgrade.alternativeCost)}
            </span>
          </button>
        </li>
      </ul>

      <div
        className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1", "px-5 py-3.5")}
      >
        <p className="text-xs text-ink-soft">
          You have {creditWord(upgrade.balance)}. Nothing is charged until you pick one.
        </p>
        {/* Hidden on touch, where there is no key to press. */}
        <p className="hidden text-xs text-ink-soft sm:block">Esc for the usual model</p>
      </div>
    </div>
  );
}
