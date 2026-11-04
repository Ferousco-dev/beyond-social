"use client";

import { useState, type ReactNode } from "react";
import { Film, Layers, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileStudioTab = "timeline" | "tools" | "inspector";

interface Panes {
  tools: ReactNode;
  preview: ReactNode;
  inspector: ReactNode;
  timeline: ReactNode;
}

/**
 * Mobile layout for the video editor.
 * Places the video preview player on top, with a segmented bottom tab
 * for switching between the Timeline, Media & Tools, and Adjust & AI.
 */
export function MobileStudioLayout({ tools, preview, inspector, timeline }: Panes) {
  const [tab, setTab] = useState<MobileStudioTab>("timeline");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      {/* Upper viewport: Preview player */}
      <div className="min-h-[200px] max-h-[46svh] flex-1 shrink-0 px-2 pt-1 pb-1.5">
        {preview}
      </div>

      {/* Tab Navigation switcher for lower viewport */}
      <nav
        aria-label="Editor sections"
        className="flex shrink-0 items-center justify-around border-t border-hairline bg-paper px-2 py-1 shadow-xs"
      >
        <button
          type="button"
          onClick={() => setTab("timeline")}
          aria-pressed={tab === "timeline"}
          className={cn(
            "inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
            tab === "timeline" ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          <Layers className="size-3.5" aria-hidden />
          Timeline
        </button>
        <button
          type="button"
          onClick={() => setTab("tools")}
          aria-pressed={tab === "tools"}
          className={cn(
            "inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
            tab === "tools" ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          <Film className="size-3.5" aria-hidden />
          Media & Tools
        </button>
        <button
          type="button"
          onClick={() => setTab("inspector")}
          aria-pressed={tab === "inspector"}
          className={cn(
            "inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
            tab === "inspector" ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Adjust & AI
        </button>
      </nav>

      {/* Lower viewport: Active Tab Content (kept mounted to preserve playback & scroll state) */}
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1">
        <div className={cn("h-full", tab !== "timeline" && "hidden")}>{timeline}</div>
        <div className={cn("h-full", tab !== "tools" && "hidden")}>{tools}</div>
        <div className={cn("h-full", tab !== "inspector" && "hidden")}>{inspector}</div>
      </div>
    </div>
  );
}
