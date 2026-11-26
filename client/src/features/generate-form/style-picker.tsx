"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { STYLE_CARDS } from "./look-art";

/**
 * The look of the video: a row of small round previews, each with a one-word
 * name that never wraps, plus one to describe your own. On a narrow screen the
 * row scrolls sideways.
 */
export function StylePicker({ value, onChange }: { value: string; onChange: (style: string) => void }) {
  const chosen = STYLE_CARDS.find((card) => card.value === value);
  const [ownOpen, setOwnOpen] = useState(value !== "" && !chosen);
  const own = ownOpen || (value !== "" && !chosen);

  const item = "group flex w-14 shrink-0 cursor-pointer flex-col items-center gap-1 focus-visible:outline-none";
  const circle = "relative block size-11 overflow-hidden rounded-full transition";

  return (
    <div className="flex flex-col gap-2">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Look">
        {STYLE_CARDS.map((card) => {
          const selected = value === card.value;
          return (
            <li key={card.value}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`${card.label}. ${card.hint}`}
                title={card.hint}
                onClick={() => {
                  setOwnOpen(false);
                  onChange(selected ? "" : card.value);
                }}
                className={item}
              >
                <span
                  className={cn(
                    circle,
                    "bg-cloud ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ink/40",
                    selected ? "ring-2 ring-primary" : "ring-1 ring-hairline group-hover:ring-ink-soft",
                  )}
                >
                  {card.art}
                </span>
                <span className={cn("whitespace-nowrap text-[11px]", selected ? "font-medium text-primary" : "text-ink-soft")}>{card.label}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-pressed={own}
            onClick={() => {
              setOwnOpen(true);
              if (chosen) onChange("");
            }}
            className={item}
          >
            <span
              className={cn(
                circle,
                "flex items-center justify-center border border-dashed group-focus-visible:ring-2 group-focus-visible:ring-ink/40",
                own ? "border-primary text-primary" : "border-ink-soft/60 text-ink-soft group-hover:text-ink",
              )}
            >
              <Pencil className="size-3.5" aria-hidden />
            </span>
            <span className={cn("whitespace-nowrap text-[11px]", own ? "font-medium text-ink" : "text-ink-soft")}>Your own</span>
          </button>
        </li>
      </ul>
      {chosen ? <p className="text-xs text-ink-soft">{chosen.hint}</p> : null}
      {own ? (
        <input
          aria-label="Describe the look"
          value={chosen ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pastel and dreamy"
          maxLength={200}
          className="h-9 w-full rounded-lg border border-hairline bg-paper px-2.5 text-sm text-ink placeholder:text-ink-soft transition-[border-color,box-shadow] focus:border-ink/30 focus:outline-none focus:ring-4 focus:ring-ink/5"
        />
      ) : null}
    </div>
  );
}
