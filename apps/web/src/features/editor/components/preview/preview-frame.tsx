import { toPercent } from "@/lib/editor/timeline";
import { type TextItem, type VideoItem } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

import { PreviewSafeAreas } from "./preview-safe-areas";

/** Feed captions are read against moving footage, so they carry their own outline. */
const CAPTION_SHADOW = "0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,1)";

/** Builds the CSS filter chain from the clip's grade. */
function filterCss(clip: VideoItem): string {
  const { brightness, contrast, saturation, temperature, blur } = clip.filters;
  // Temperature has no CSS primitive; sepia approximates warmth and a hue shift
  // approximates cool, closely enough for a preview and free to render.
  const warmth = temperature > 0 ? `sepia(${(temperature / 100).toFixed(2)})` : "";
  const cool = temperature < 0 ? `hue-rotate(${Math.round(temperature / 2)}deg)` : "";
  return [
    `brightness(${brightness})`,
    `contrast(${contrast})`,
    `saturate(${saturation})`,
    blur > 0 ? `blur(${blur}px)` : "",
    warmth,
    cool,
  ]
    .filter(Boolean)
    .join(" ");
}

export function PreviewFrame({
  frameClassName,
  clip,
  caption,
  currentMs,
  durationMs,
  showSafeAreas,
}: {
  frameClassName: string;
  clip: VideoItem | undefined;
  caption: TextItem | undefined;
  currentMs: number;
  durationMs: number;
  showSafeAreas: boolean;
}) {
  const style = caption?.style;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline bg-black",
        frameClassName,
      )}
    >
      {/* Stand-in for the rendered frame, carrying the clip's transform and grade
          so the panels visibly do something before real media is attached. */}
      {clip ? (
        <div
          aria-hidden
          style={{
            opacity: clip.opacity,
            filter: filterCss(clip),
            transform: `translate(${clip.transform.x}%, ${clip.transform.y}%) scale(${clip.transform.scale}) rotate(${clip.transform.rotation}deg)`,
          }}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-xs text-white/40 transition-[filter,opacity,transform] duration-150"
        >
          {clip.label}
        </div>
      ) : null}

      {showSafeAreas ? <PreviewSafeAreas /> : null}

      {caption && style ? (
        <p
          style={{
            textShadow: CAPTION_SHADOW,
            fontSize: `${style.fontSize / 2}px`,
            color: style.color,
            backgroundColor: style.background ?? "transparent",
            fontWeight: style.bold ? 700 : 400,
            fontStyle: style.italic ? "italic" : "normal",
            textTransform: style.uppercase ? "uppercase" : "none",
            textAlign: style.align,
          }}
          className="absolute inset-x-6 bottom-[26%] text-balance leading-tight"
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
