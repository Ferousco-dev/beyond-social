"use client";

import { useId, useState } from "react";

import { Select } from "@/components/ui/select";

const CUSTOM = "__custom__";

/**
 * One choice from a longer list, kept to a single line: a dropdown of presets,
 * with "Custom" opening a text box for the person's own answer.
 */
export function ChoiceSelect({
  label,
  options,
  value,
  onChange,
  customPlaceholder,
  emptyLabel = "Not set",
  id,
  invalid,
}: {
  label: string;
  options: readonly { readonly value: string; readonly label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** Offer a Custom entry with a text field. Omit to allow presets only. */
  customPlaceholder?: string;
  /** What the empty choice is called. */
  emptyLabel?: string;
  /** Put on the dropdown, so a failed step can move focus to it. */
  id?: string;
  invalid?: boolean;
}) {
  const inputId = useId();
  const isPreset = value === "" || options.some((option) => option.value === value);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const custom = customPlaceholder !== undefined && (customOpen || !isPreset);

  const all = [
    { value: "", label: emptyLabel },
    ...options,
    ...(customPlaceholder !== undefined ? [{ value: CUSTOM, label: "Custom…" }] : []),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <Select
        aria-label={label}
        {...(id !== undefined ? { id } : {})}
        {...(invalid !== undefined ? { invalid } : {})}
        options={all}
        value={custom ? CUSTOM : value}
        onValueChange={(next) => {
          if (next === CUSTOM) {
            setCustomOpen(true);
            if (isPreset) onChange("");
            return;
          }
          setCustomOpen(false);
          onChange(next);
        }}
      />
      {custom ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            {label}, custom
          </label>
          {/* Grows with the answer so the whole of it stays readable; it is still one line of meaning, so line breaks become spaces. */}
          <textarea
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, " "))}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder={customPlaceholder}
            maxLength={200}
            rows={1}
            className="field-sizing-content min-h-11 w-full resize-none rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm leading-6 text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </>
      ) : null}
    </div>
  );
}
