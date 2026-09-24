"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { type GenerationMode } from "@/lib/chat/send-schema";

const OPTIONS: readonly { mode: GenerationMode; label: string; description: string }[] = [
  { mode: "auto", label: "Auto", description: "Best fit" },
  { mode: "low", label: "Low", description: "Veo" },
  { mode: "middle", label: "Middle", description: "Balanced" },
  { mode: "high", label: "High", description: "Most capable" },
];

export function GenerationModeSelector({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((option) => option.mode === mode) ?? OPTIONS[0]!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose generation quality"
        title="Choose generation quality"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-2 text-xs text-ink-soft transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        <span>{selected.label}</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-2 min-w-44 rounded-lg border border-hairline bg-paper p-1 shadow-card"
          >
            {OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                role="menuitemradio"
                aria-checked={mode === option.mode}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(option.mode);
                  setOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-canvas ${
                  mode === option.mode ? "bg-primary-soft text-ink" : "text-ink"
                }`}
              >
                <span className="block text-xs font-medium">{option.label}</span>
                <span className="block text-[11px] text-ink-soft">{option.description}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
