"use client";

import { Pencil } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface LookCard {
  readonly value: string;
  readonly label: string;
  /** One plain line saying what it looks like. */
  readonly hint?: string;
  /** What the tile shows: a picture or an illustration. */
  readonly art: ReactNode;
}

/**
 * Choosing a look by seeing it: each option is a small picture circle, and the
 * chosen one is explained underneath. Tapping the chosen one again clears it; "Write my own"
 * opens a text box for anything not listed.
 */
export function LookCards({
  label,
  cards,
  value,
  onChange,
  customPlaceholder,
  note,
}: {
  label: string;
  cards: readonly LookCard[];
  value: string;
  onChange: (value: string) => void;
  customPlaceholder: string;
  note?: ReactNode;
}) {
  const inputId = useId();
  const chosen = cards.find((card) => card.value === value);
  const isPreset = chosen !== undefined;
  const [customOpen, setCustomOpen] = useState(value !== "" && !isPreset);
  const custom = customOpen || (value !== "" && !isPreset);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <span className="text-sm font-medium text-ink">
        {label} <span className="font-normal text-ink-soft">(optional)</span>
      </span>
      <ul className="flex flex-wrap gap-x-3 gap-y-4">
        {cards.map((card) => {
          const selected = value === card.value;
          return (
            <li key={card.value} className="w-[4.5rem]">
              <button
                type="button"
                aria-pressed={selected}
                aria-label={card.hint ? `${card.label}. ${card.hint}` : card.label}
                title={card.hint}
                onClick={() => {
                  setCustomOpen(false);
                  onChange(selected ? "" : card.value);
                }}
                className="group flex w-full cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  className={cn(
                    "relative block size-14 overflow-hidden rounded-full bg-cloud ring-2 transition",
                    selected ? "ring-ink" : "ring-hairline group-hover:ring-ink-soft",
                  )}
                >
                  {card.art}
                </span>
                <span className={cn("w-full text-center text-xs leading-tight", selected ? "font-medium text-ink" : "text-ink-soft")}>{card.label}</span>
              </button>
            </li>
          );
        })}
        <li className="w-[4.5rem]">
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => {
              setCustomOpen(true);
              if (isPreset) onChange("");
            }}
            className="group flex w-full cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full border border-dashed transition",
                custom ? "border-ink text-ink" : "border-ink-soft text-ink-soft group-hover:text-ink",
              )}
            >
              <Pencil className="size-4" aria-hidden />
            </span>
            <span className={cn("w-full text-center text-xs leading-tight", custom ? "font-medium text-ink" : "text-ink-soft")}>Write my own</span>
          </button>
        </li>
      </ul>
      {chosen?.hint ? (
        <p className="text-xs text-ink-soft">
          <span className="font-medium text-ink">{chosen.label}:</span> {chosen.hint}
        </p>
      ) : null}
      {custom ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            {label}, in your own words
          </label>
          <input
            id={inputId}
            value={isPreset ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={customPlaceholder}
            maxLength={200}
            className="h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
          />
        </>
      ) : null}
      {note ? <p className="text-xs text-ink-soft">{note}</p> : null}
    </div>
  );
}
