"use client";

import { type ReactNode } from "react";

/** Labelled slider with a live value, the workhorse control of the tool panels. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs text-ink-soft">
        {label}
        <span className="tabular-nums text-ink">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-primary"
      />
    </label>
  );
}

/** Section heading inside a panel. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

/** Shown when a panel needs a selection it does not have. */
export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-ink-soft">{children}</p>;
}

/** Row of mutually exclusive choices. */
export function Choices<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            value === option
              ? "border-primary bg-primary/10 text-ink"
              : "border-hairline text-ink-soft hover:bg-cloud hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
