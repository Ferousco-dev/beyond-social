import { Music } from "lucide-react";
import { type ReactNode } from "react";

import { CAPTIONS, CLIPS, RULER } from "@/lib/editor/data";

function TrackLabel({ children }: { children: ReactNode }) {
  return (
    <span className="w-16 shrink-0 pr-2 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
      {children}
    </span>
  );
}

export function EditorTimeline(): ReactNode {
  return (
    <div className="shrink-0 border-t border-hairline bg-paper p-3">
      <div className="mb-2 flex justify-between pl-16 text-[10px] tabular-nums text-ink-soft">
        {RULER.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <div className="relative">
        {/* Playhead spans the track area, offset past the label column. */}
        <div className="pointer-events-none absolute inset-y-0 left-16 right-0">
          <div className="absolute bottom-0 left-[18%] top-0 w-px bg-primary" aria-hidden />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center">
            <TrackLabel>Video</TrackLabel>
            <div className="flex flex-1 gap-1">
              {CLIPS.map((clip) => (
                <div
                  key={clip.id}
                  style={{ flexGrow: clip.grow }}
                  className="flex h-11 items-center justify-center truncate rounded-md border border-hairline bg-cloud px-2 text-xs text-ink"
                >
                  {clip.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <TrackLabel>Captions</TrackLabel>
            <div className="flex flex-1 gap-1">
              {CAPTIONS.map((caption) => (
                <div
                  key={caption.id}
                  className="flex h-7 flex-1 items-center truncate rounded-md border border-primary/20 bg-primary/10 px-2 text-[11px] text-primary"
                >
                  {caption.text}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <TrackLabel>Music</TrackLabel>
            <div className="flex h-8 flex-1 items-center gap-1.5 rounded-md border border-hairline bg-cloud px-2.5 text-[11px] text-ink-soft">
              <Music className="size-3.5" />
              Sunrise Run
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
