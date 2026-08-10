"use client";

import { INDUSTRY_CATEGORIES } from "@/lib/trends/categories";
import { cn } from "@/lib/utils";

/**
 * Choosing an industry.
 *
 * Radio semantics rather than a row of buttons, for the same reason as the
 * filter chips: this is one choice with options, and a screen reader hearing ten
 * unrelated toggles would have no way to know only one can hold.
 *
 * Shown as a grid rather than a select because the list is short enough to read
 * at a glance, and the whole point is that the answer changes what the product
 * suggests. Burying it in a dropdown makes it feel like a setting nobody needs
 * to touch.
 */
export function IndustryPicker({
  value,
  onChange,
}: {
  value: string | null;
  /** Null when the active choice is pressed again, which clears it. */
  onChange: (industry: string | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Your industry"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {INDUSTRY_CATEGORIES.map((industry) => {
        const active = industry.id === value;
        return (
          <button
            key={industry.id}
            type="button"
            role="radio"
            aria-checked={active}
            // Pressing the active one clears it. A radio group normally has no
            // way back to nothing, and "I would rather not say" is a real answer
            // to this question.
            onClick={() => onChange(active ? null : industry.id)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "border-ink bg-ink text-paper"
                : "border-hairline bg-paper text-ink hover:bg-cloud",
            )}
          >
            <industry.icon
              className={cn("size-4 shrink-0", active ? "opacity-80" : "text-ink-soft")}
              aria-hidden
            />
            <span className="min-w-0 truncate">{industry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
