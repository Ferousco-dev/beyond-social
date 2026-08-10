"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";

import { type OnboardingStep } from "@/lib/onboarding/steps";
import { cn } from "@/lib/utils";

/**
 * One row of the checklist.
 *
 * A done step is struck through and stays visible rather than disappearing:
 * seeing what you have already finished is most of what makes a list like this
 * feel like progress instead of a backlog.
 *
 * Only the next unfinished step can be expanded to show what it involves. The
 * rest are titles, because six open explanations is a wall of text, and the
 * question a checklist answers is "what now", singular.
 */
export function ChecklistItem({
  step,
  done,
  expanded,
  onToggle,
}: {
  step: OnboardingStep;
  done: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `onboarding-${step.id}`;

  return (
    <li className={cn("rounded-xl transition-colors", expanded && "bg-cloud")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={done}
        aria-expanded={done ? undefined : expanded}
        aria-controls={done ? undefined : panelId}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          done ? "cursor-default" : "cursor-pointer hover:bg-cloud",
        )}
      >
        <span
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
            done
              ? "border-primary bg-primary text-paper"
              : "border-dashed border-hairline text-transparent",
          )}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>

        <span className={cn("min-w-0 flex-1", done ? "text-ink-soft line-through" : "text-ink")}>
          {step.title}
        </span>

        {done ? null : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ink-soft transition-transform motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        )}
      </button>

      {expanded && !done ? (
        <div id={panelId} className="px-3 pb-3 pl-12">
          <p className="text-xs leading-relaxed text-ink-soft">{step.blurb}</p>
          <Link
            href={step.href}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <step.icon className="size-3.5" aria-hidden />
            {step.action}
          </Link>
        </div>
      ) : null}
    </li>
  );
}
