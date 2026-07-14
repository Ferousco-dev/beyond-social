import { Music } from "lucide-react";
import { type ReactNode } from "react";

import { CAPTIONS, CLIPS, RULER } from "@/lib/editor/data";

export function EditorTimeline(): ReactNode {
  return (
    <div className="shrink-0 border-t border-hairline bg-paper p-3">
      <div className="mb-2 flex items-center justify-between px-0.5 text-[10px] tabular-nums text-ink-soft">
        {RULER.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <div className="relative space-y-1.5">
        {/* Playhead */}
        <div className="absolute bottom-0 left-[18%] top-0 z-10 w-px bg-primary" aria-hidden />

        <div className="flex gap-1">
          {CLIPS.map((clip) => (
            <div
              key={clip.id}
              style={{ flexGrow: clip.grow }}
              className="flex h-12 items-center justify-center truncate rounded-md bg-cloud px-2 text-xs text-ink"
            >
              {clip.label}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {CAPTIONS.map((caption) => (
            <div
              key={caption.id}
              className="flex h-7 flex-1 items-center truncate rounded-md bg-primary/10 px-2 text-[11px] text-primary"
            >
              {caption.text}
            </div>
          ))}
        </div>

        <div className="flex h-8 items-center gap-1.5 rounded-md bg-cloud px-2.5 text-[11px] text-ink-soft">
          <Music className="size-3.5" />
          Sunrise Run
        </div>
      </div>
    </div>
  );
}
