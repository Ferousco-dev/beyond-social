import { type Caption } from "@/lib/editor/data";
import { toPercent } from "@/lib/editor/timeline";
import { cn } from "@/lib/utils";

import { PreviewSafeAreas } from "./preview-safe-areas";

/** Feed captions are read against moving footage, so they carry their own outline. */
const CAPTION_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,1)";

export function PreviewFrame({
  frameClassName,
  caption,
  currentMs,
  durationMs,
  showSafeAreas,
}: {
  frameClassName: string;
  caption: Caption | undefined;
  currentMs: number;
  durationMs: number;
  showSafeAreas: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline bg-black",
        frameClassName,
      )}
    >
      {showSafeAreas ? <PreviewSafeAreas /> : null}

      {caption ? (
        <p
          style={{ textShadow: CAPTION_SHADOW }}
          className="absolute inset-x-6 bottom-[26%] text-balance text-center text-base font-bold leading-tight text-white"
        >
          {caption.text}
        </p>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25" aria-hidden>
        <div
          style={{ width: `${toPercent(currentMs, durationMs)}%` }}
          className="h-full bg-white"
        />
      </div>
    </div>
  );
}
