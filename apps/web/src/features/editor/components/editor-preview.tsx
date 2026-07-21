"use client";

import { Frame, Pause, Play } from "lucide-react";
import { useState } from "react";

import { CAPTIONS } from "@/lib/editor/data";
import { captionAt, formatTimecode } from "@/lib/editor/timeline";
import { cn } from "@/lib/utils";

import { type Playback } from "../hooks/use-playback";
import { PreviewFrame } from "./preview/preview-frame";

const RATIOS = [
  { id: "portrait", label: "9:16", frame: "aspect-[9/16] h-full max-h-[52vh]" },
  { id: "square", label: "1:1", frame: "aspect-square h-full max-h-[52vh]" },
  { id: "landscape", label: "16:9", frame: "aspect-video w-full max-w-[68%]" },
] as const;

type RatioId = (typeof RATIOS)[number]["id"];

export function EditorPreview({ playback }: { playback: Playback }) {
  const [ratio, setRatio] = useState<RatioId>("portrait");
  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const frame = RATIOS.find((item) => item.id === ratio)?.frame ?? RATIOS[0].frame;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6">
      <div className="flex items-center gap-2">
        <div className="flex rounded-full border border-hairline p-0.5" role="group">
          {RATIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRatio(item.id)}
              aria-pressed={ratio === item.id}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                ratio === item.id ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowSafeAreas((shown) => !shown)}
          aria-pressed={showSafeAreas}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            showSafeAreas ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          <Frame className="size-3.5" />
          Safe areas
        </button>
      </div>

      <PreviewFrame
        frameClassName={frame}
        caption={captionAt(CAPTIONS, playback.currentMs)}
        currentMs={playback.currentMs}
        durationMs={playback.durationMs}
        showSafeAreas={showSafeAreas}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playback.toggle}
          aria-label={playback.isPlaying ? "Pause" : "Play"}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {playback.isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 translate-x-px" />
          )}
        </button>
        <span className="text-xs tabular-nums text-ink-soft">
          {formatTimecode(playback.currentMs)} / {formatTimecode(playback.durationMs)}
        </span>
      </div>
    </div>
  );
}
