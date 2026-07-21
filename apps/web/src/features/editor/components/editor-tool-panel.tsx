"use client";

import { Captions, Music, Scissors, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { type ClipsState } from "../hooks/use-clips";
import { type Playback } from "../hooks/use-playback";
import { AdjustPanel } from "./tools/adjust-panel";
import { CaptionsPanel } from "./tools/captions-panel";
import { ClipPanel } from "./tools/clip-panel";
import { MusicPanel } from "./tools/music-panel";

type TabId = "clip" | "captions" | "music" | "adjust";

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "clip", label: "Clip", icon: Scissors },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "music", label: "Music", icon: Music },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
];

export function EditorToolPanel({
  className,
  clips,
  playback,
}: {
  className?: string;
  clips: ClipsState;
  playback: Playback;
}) {
  const [tab, setTab] = useState<TabId>("captions");
  const selected = clips.clips.find((clip) => clip.id === clips.selectedId);

  // Selecting a clip on the timeline is a request to inspect it.
  useEffect(() => {
    if (clips.selectedId) setTab("clip");
  }, [clips.selectedId]);

  return (
    <div className={cn("w-80 shrink-0 border-r border-hairline bg-paper", className)}>
      <nav
        aria-label="Editor tools"
        className="flex w-14 shrink-0 flex-col gap-1 border-r border-hairline p-2"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            title={item.label}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              tab === item.id ? "bg-cloud text-ink" : "text-ink-soft hover:bg-cloud",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "clip" ? (
          selected ? (
            <ClipPanel
              clip={selected}
              onTrim={(edge, ms) => clips.trim(selected.id, edge, ms)}
              onSeek={playback.seek}
            />
          ) : (
            <p className="text-xs leading-relaxed text-ink-soft">
              Select a clip on the timeline to trim it.
            </p>
          )
        ) : null}

        {tab === "captions" ? (
          <CaptionsPanel currentMs={playback.currentMs} onSeek={playback.seek} />
        ) : null}

        {tab === "music" ? <MusicPanel /> : null}

        {tab === "adjust" ? <AdjustPanel /> : null}
      </div>
    </div>
  );
}
