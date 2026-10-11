"use client";

import {
  Gauge,
  Library,
  Music,
  Palette,
  Scissors,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { isAudio, isText, isVideo } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

import { type EditorState } from "../hooks/use-editor-state";
import { type Playback } from "../hooks/use-playback";
import { AudioPanel } from "./tools/audio-panel";
import { FiltersPanel } from "./tools/filters-panel";
import { MediaPanel } from "./tools/media-panel";
import { MusicPanel } from "./tools/music-panel";
import { SpeedPanel } from "./tools/speed-panel";
import { TextPanel } from "./tools/text-panel";
import { TransformPanel } from "./tools/transform-panel";

type TabId = "media" | "transform" | "speed" | "filters" | "text" | "audio" | "music";

/*
 * Media and Music are visible again, and no longer gated.
 *
 * They were hidden behind a flag because their libraries were four invented
 * titles apiece with no files behind them. The invented data is gone and both
 * panels now say what the editor can actually do: Media reports what is on the
 * timeline and where clips come from, Music explains that a soundtrack cannot be
 * added yet. A panel that states a limit is worth showing; one that pretends
 * past it is not, and a flag guarding the second was only ever a stay of
 * execution.
 */
const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "media", label: "Media", icon: Library },
  { id: "transform", label: "Adjust", icon: Scissors },
  { id: "speed", label: "Speed", icon: Gauge },
  { id: "filters", label: "Filters", icon: Palette },
  { id: "text", label: "Text", icon: Type },
  { id: "audio", label: "Audio", icon: Sparkles },
  { id: "music", label: "Music", icon: Music },
];

export function EditorToolPanel({
  className,
  editor,
  playback,
}: {
  className?: string;
  editor: EditorState;
  playback: Playback;
}) {
  // The first tab that is actually shown. Defaulting to "media" outlived the
  // tab itself once the stock libraries were held back, which opened the panel
  // on a tab that was not in the list and rendered nothing.
  const [tab, setTab] = useState<TabId>(TABS[0]?.id ?? "transform");
  const selected = editor.selected;

  // Selecting an item is a request to inspect it, so jump to the panel that can
  // actually edit that kind rather than leaving the user on an inert tab.
  useEffect(() => {
    if (!selected) return;
    if (isText(selected)) setTab("text");
    else if (isAudio(selected)) setTab("audio");
    else setTab("transform");
  }, [selected]);

  const video = selected && isVideo(selected) ? selected : null;

  return (
    <div className={cn("w-72 shrink-0 flex-col border-r border-hairline bg-paper", className)}>
      <nav
        aria-label="Editor tools"
        className="grid shrink-0 grid-cols-4 gap-1 border-b border-hairline p-2"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            title={item.label}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              tab === item.id ? "bg-cloud text-ink" : "text-ink-soft hover:bg-cloud",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "media" ? <MediaPanel editor={editor} /> : null}
        {tab === "transform" ? <TransformPanel item={video} editor={editor} /> : null}
        {tab === "speed" ? <SpeedPanel item={video} editor={editor} /> : null}
        {tab === "filters" ? <FiltersPanel item={video} editor={editor} /> : null}
        {tab === "text" ? <TextPanel editor={editor} playback={playback} /> : null}
        {tab === "audio" ? (
          <AudioPanel item={selected && isAudio(selected) ? selected : null} editor={editor} />
        ) : null}
        {tab === "music" ? <MusicPanel editor={editor} /> : null}
      </div>
    </div>
  );
}
