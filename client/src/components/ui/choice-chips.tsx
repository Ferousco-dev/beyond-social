"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

const chipClass =
  "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

export function Chip({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        chipClass,
        selected ? "border-ink bg-ink font-medium text-paper" : "border-hairline bg-paper text-ink hover:bg-cloud",
      )}
    >
      {children}
    </button>
  );
}

/**
 * One choice from a set of presets, with an optional custom answer.
 *
 * A value outside the presets is a custom answer, so a saved draft reopens
 * with the custom field showing what was typed.
 */
export function ChoiceChips({
  label,
  options,
  value,
  onChange,
  customPlaceholder,
  disabled,
}: {
  label: string;
  options: readonly { readonly value: string; readonly label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** Offer a Custom chip with a text field. Omit to allow presets only. */
  customPlaceholder?: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const isPreset = options.some((option) => option.value === value);
  const [customOpen, setCustomOpen] = useState(!isPreset && value !== "");
  const custom = customPlaceholder !== undefined && (customOpen || (!isPreset && value !== ""));

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            selected={!custom && value === option.value}
            disabled={disabled}
            onClick={() => {
              setCustomOpen(false);
              onChange(option.value);
            }}
          >
            {option.label}
          </Chip>
        ))}
        {customPlaceholder !== undefined ? (
          <Chip
            selected={custom}
            disabled={disabled}
            onClick={() => {
              setCustomOpen(true);
              if (isPreset) onChange("");
            }}
          >
            Custom
          </Chip>
        ) : null}
      </div>
      {custom ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            {label}, custom
          </label>
          <input
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={customPlaceholder}
            maxLength={200}
            disabled={disabled}
            className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:opacity-70"
          />
        </>
      ) : null}
    </div>
  );
}
