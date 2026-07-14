"use client";

import { Captions, Music, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { CAPTIONS, MUSIC } from "@/lib/editor/data";
import { cn } from "@/lib/utils";

const TABS: ReadonlyArray<{ id: string; label: string; icon: LucideIcon }> = [
  { id: "captions", label: "Captions", icon: Captions },
  { id: "music", label: "Music", icon: Music },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
];

const ADJUSTMENTS = ["Brightness", "Contrast", "Saturation", "Speed"] as const;

export function EditorToolPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState("captions");

  return (
    <div className={cn("w-72 shrink-0 flex-col border-r border-hairline bg-paper", className)}>
      <div className="flex gap-1 border-b border-hairline p-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
              tab === item.id ? "bg-cloud text-ink" : "text-ink-soft hover:bg-cloud",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "captions" ? (
          <ul className="space-y-1.5">
            {CAPTIONS.map((caption) => (
              <li
                key={caption.id}
                className="rounded-lg border border-hairline p-2.5 transition-colors hover:bg-cloud"
              >
                <p className="text-[11px] tabular-nums text-ink-soft">{caption.time}</p>
                <p className="mt-0.5 text-sm text-ink">{caption.text}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "music" ? (
          <ul className="space-y-1">
            {MUSIC.map((track) => (
              <li
                key={track.id}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-cloud"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-cloud text-ink-soft">
                    <Music className="size-4" />
                  </span>
                  <span className="text-sm text-ink">{track.title}</span>
                </div>
                <span className="text-xs tabular-nums text-ink-soft">{track.length}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "adjust" ? (
          <div className="space-y-4">
            {ADJUSTMENTS.map((label) => (
              <label key={label} className="block">
                <span className="text-xs font-medium text-ink">{label}</span>
                <input
                  type="range"
                  defaultValue={50}
                  aria-label={label}
                  className="mt-1.5 w-full accent-primary"
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
