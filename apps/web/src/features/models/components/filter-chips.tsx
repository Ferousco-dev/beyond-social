"use client";

import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChipOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: LucideIcon;
  readonly count: number;
}

/**
 * A row of filter chips.
 *
 * Radio semantics rather than a row of buttons: exactly one value is active at
 * a time, and a screen reader should hear it as one choice with options, not as
 * several unrelated toggles. Arrow keys then work without any key handling of
 * our own.
 */
export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors pointer-coarse:min-h-11",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "border-ink bg-ink text-paper"
                : "border-hairline bg-paper text-ink-soft hover:bg-cloud hover:text-ink",
            )}
          >
            {option.icon ? <option.icon className="size-3.5" aria-hidden /> : null}
            {option.label}
            <span className={cn("tabular-nums", active ? "opacity-60" : "opacity-70")}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
