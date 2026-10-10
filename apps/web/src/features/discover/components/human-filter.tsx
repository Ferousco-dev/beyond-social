"use client";

import { Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type HumanFilter = "all" | "human" | "not-human";

const OPTIONS: readonly { value: HumanFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "human", label: "Human-led" },
  { value: "not-human", label: "No person" },
];

/**
 * All / human-led / no-person, as a segmented control beside the result
 * count. Scraping is slow and the client's own standing complaint, and most
 * of what comes back is not a person on camera, so this is what lets someone
 * narrow to the kind of video worth building from without re-reading every
 * tile by eye.
 *
 * `pending` posts (still being classified) count toward "All" but not toward
 * either of the other two, so switching the filter the moment results land
 * does not read as the grid losing videos it has not finished looking at yet.
 */
export function HumanFilterControl({
  value,
  onChange,
  pending,
}: {
  value: HumanFilter;
  onChange: (value: HumanFilter) => void;
  /** How many results have not been classified yet. */
  pending: number;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by whether a person is on camera"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-hairline bg-paper p-0.5"
    >
      <Users className="ml-1.5 size-3.5 text-ink-soft" aria-hidden />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex h-7 cursor-pointer items-center rounded-[6px] px-2.5 text-[12px] font-medium transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            value === option.value ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
      {pending > 0 ? (
        <span className="pr-2 text-[11px] tabular-nums text-ink-soft" aria-live="polite">
          sorting {pending}…
        </span>
      ) : null}
    </div>
  );
}
