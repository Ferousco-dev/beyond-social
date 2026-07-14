"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const RATIOS = [
  { id: "portrait", label: "9:16", frame: "aspect-[9/16] h-full max-h-[52vh]" },
  { id: "square", label: "1:1", frame: "aspect-square h-full max-h-[52vh]" },
  { id: "landscape", label: "16:9", frame: "aspect-video w-full max-w-[68%]" },
];

export function EditorPreview() {
  const [ratio, setRatio] = useState("portrait");
  const frame = RATIOS.find((item) => item.id === ratio)?.frame ?? RATIOS[0]?.frame ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6">
      <div className="flex rounded-full border border-hairline p-0.5">
        {RATIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRatio(item.id)}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium tabular-nums transition-colors",
              ratio === item.id ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={cn("relative overflow-hidden rounded-xl border border-hairline bg-black", frame)}
      >
        <span className="absolute left-1/2 top-1/2 inline-flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black">
          <Play className="size-5 translate-x-px" />
        </span>
        <span className="absolute inset-x-3 bottom-6 flex justify-center">
          <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-black">
            New arrivals just dropped
          </span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Play"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90"
        >
          <Play className="size-4 translate-x-px" />
        </button>
        <span className="text-xs tabular-nums text-ink-soft">0:00 / 0:30</span>
      </div>
    </div>
  );
}
