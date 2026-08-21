"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

import { useChecklistState } from "../hooks/use-checklist-state";
import { ChecklistItem } from "./checklist-item";

/**
 * The getting-started panel.
 *
 * Docked bottom-right so it is available on every screen without being in the
 * way of any of them, and shut with one click. It disappears for good once every
 * step is done: a checklist with nothing left on it is clutter, and asking
 * somebody to dismiss a panel congratulating them is a poor last impression.
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

  return (
    /*
     * Docked to the top on a phone, to the bottom everywhere else.
     *
     * It used to be `hidden` below `sm`, on the reasoning that a panel anchored
     * bottom-right covers the send button and, on the discover feed, the one
     * control the screen exists for. That part was right; the conclusion was
     * not. This component is the only place the steps are rendered, so hiding
     * it meant a first-time user on a phone got no guidance at all, which is
     * most first-time users of a short-form video product.
     *
     * The top edge is the one place nothing is anchored, so it goes there
     * instead: below the header, above the content, clear of the composer.
     */
    <aside
      aria-label="Getting started"
      className="pointer-events-auto fixed inset-x-3 top-[4.5rem] z-40 overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:w-[min(22rem,calc(100vw-2rem))]"
    >
      <div className="flex items-start gap-2 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Get started</h2>
          {collapsed ? null : (
            <p className="mt-0.5 text-xs text-ink-soft">Six steps to your first published video</p>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand getting started" : "Collapse getting started"}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              collapsed && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide getting started"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {collapsed ? null : (
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
      )}

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
