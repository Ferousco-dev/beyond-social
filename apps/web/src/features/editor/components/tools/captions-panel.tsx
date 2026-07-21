"use client";

import { CAPTIONS } from "@/lib/editor/data";
import { captionAt, formatTimecode } from "@/lib/editor/timeline";
import { cn } from "@/lib/utils";

export function CaptionsPanel({
  currentMs,
  onSeek,
}: {
  currentMs: number;
  onSeek: (ms: number) => void;
}) {
  const active = captionAt(CAPTIONS, currentMs);

  return (
    <ul className="space-y-1.5">
      {CAPTIONS.map((caption) => (
        <li key={caption.id}>
          <button
            type="button"
            onClick={() => onSeek(caption.startMs)}
            aria-current={active?.id === caption.id}
            className={cn(
              "w-full cursor-pointer rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active?.id === caption.id
                ? "border-primary bg-primary/5"
                : "border-hairline hover:bg-cloud",
            )}
          >
            <p className="text-[11px] tabular-nums text-ink-soft">
              {formatTimecode(caption.startMs)}
            </p>
            <p className="mt-0.5 text-sm text-ink">{caption.text}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
