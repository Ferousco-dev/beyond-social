"use client";

import { ProgressBar, useEstimatedProgress } from "@/components/ui/progress-bar";

/** A video render's progress, with the estimate labelled as one. */
export function GenerationProgress({ reported, running, label = "Video generation" }: { reported: number; running: boolean; label?: string }) {
  const { value, estimated } = useEstimatedProgress(reported, running);
  if (!running) return null;
  return (
    <div className="mt-2 flex max-w-sm items-center gap-3">
      <ProgressBar value={value} label={label} className="flex-1" />
      <span className="shrink-0 text-xs tabular-nums text-ink-soft">
        {estimated ? "about " : ""}
        {Math.round(value)}%
      </span>
    </div>
  );
}
