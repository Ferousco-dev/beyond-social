"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";

import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

import { useChecklistState } from "../hooks/use-checklist-state";
import { ChecklistItem } from "./checklist-item";
import { ProgressRing } from "./progress-ring";

/*
 * Docked to the top on a phone, to the bottom everywhere else.
 *
 * It used to be `hidden` below `sm`, on the reasoning that a panel anchored
 * bottom-right covers the send button and, on the discover feed, the one
 * control the screen exists for. That part was right; the conclusion was not.
 * This component is the only place the steps are rendered, so hiding it meant
 * a first-time user on a phone got no guidance at all, which is most
 * first-time users of a short-form video product.
 *
 * The top edge is the one place nothing is anchored, so it goes there
 * instead: below the header, above the content, clear of the composer.
 *
 * The two states are written out rather than composed from one shared string:
 * `inset-x-auto` and `right-4` are different properties resolving the same
 * edge, and which one wins is decided by the order Tailwind emits them, not the
 * order they are listed here. Sharing a base string is how the expanded panel
 * ended up pinned to the left of the page.
 */
const ANCHOR_COLLAPSED =
  "pointer-events-auto fixed z-40 right-3 top-[4.5rem] sm:bottom-4 sm:right-4 sm:top-auto";
const ANCHOR_EXPANDED =
  "pointer-events-auto fixed z-40 inset-x-3 top-[4.5rem] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto";

// Grows out of the corner it is docked to, so expanding reads as the pill
// opening rather than a new panel arriving over the page.
const ENTER =
  "animate-in fade-in zoom-in-95 duration-200 ease-out origin-top-right sm:origin-bottom-right motion-reduce:animate-none";

/**
 * The getting-started panel.
 *
 * Docked bottom-right so it is available on every screen without being in the
 * way of any of them, and shut with one click. It disappears for good once every
 * step is done: a checklist with nothing left on it is clutter, and asking
 * somebody to dismiss a panel congratulating them is a poor last impression.
 *
 * Collapsed, it is a pill rather than a shrunken card: a progress ring, the
 * label, and the control that opens it. Anything else at that size is a card
 * with its contents cut off, which reads as broken rather than tidy.
 */
export function OnboardingChecklist({ done }: { done: readonly OnboardingStepId[] }) {
  const { ready, collapsed, dismissed, toggleCollapsed, dismiss } = useChecklistState();
  const completed = new Set(done);

  // Opens on whatever comes next, so the panel answers "what now" without a
  // click. Null once the user closes that one, and they are browsing the list.
  const firstOpen = ONBOARDING_STEPS.find((step) => !completed.has(step.id))?.id ?? null;
  const [expanded, setExpanded] = useState<OnboardingStepId | null>(firstOpen);

  // Hidden until the stored state is read, so a panel somebody shut last week
  // does not flash open on every navigation.
  if (!ready || dismissed || completed.size === ONBOARDING_STEPS.length) return null;

  const percent = Math.round((completed.size / ONBOARDING_STEPS.length) * 100);

  if (collapsed) {
    return (
      <aside aria-label="Getting started" className={cn(ANCHOR_COLLAPSED, ENTER)}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={false}
          className="inline-flex min-h-9 cursor-pointer items-center gap-2.5 rounded-full border border-hairline bg-paper py-2 pl-2.5 pr-3.5 shadow-card pointer-coarse:min-h-11 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ProgressRing value={completed.size} max={ONBOARDING_STEPS.length} />
          <span className="text-sm font-medium text-ink">Get started</span>
          <span className="sr-only">
            , {completed.size} of {ONBOARDING_STEPS.length} done. Expand.
          </span>
          <ChevronUp className="size-4 text-ink-soft" aria-hidden />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Getting started"
      className={cn(
        ANCHOR_EXPANDED,
        ENTER,
        "overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card sm:w-[min(22rem,calc(100vw-2rem))]",
      )}
    >
      <div className="flex items-start gap-2 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Get started</h2>
          <p className="mt-0.5 text-xs text-ink-soft">Six steps to your first published video</p>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded
          aria-label="Collapse getting started"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft pointer-coarse:size-11 transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronDown className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide getting started"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft pointer-coarse:size-11 transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <ul className="max-h-[45vh] overflow-y-auto px-2 pb-1 sm:max-h-[50vh]">
        {ONBOARDING_STEPS.map((step) => (
          <ChecklistItem
            key={step.id}
            step={step}
            done={completed.has(step.id)}
            expanded={expanded === step.id}
            onToggle={() => setExpanded((current) => (current === step.id ? null : step.id))}
          />
        ))}
      </ul>

      <div className="flex items-center gap-3 border-t border-hairline px-4 py-3">
        <p className="shrink-0 text-xs font-medium tabular-nums text-ink">
          {completed.size} of {ONBOARDING_STEPS.length} done
        </p>
        <div
          role="progressbar"
          aria-valuenow={completed.size}
          aria-valuemin={0}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-label="Getting started progress"
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-cloud"
        >
          <div
            style={{ width: `${percent}%` }}
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          />
        </div>
      </div>
    </aside>
  );
}
