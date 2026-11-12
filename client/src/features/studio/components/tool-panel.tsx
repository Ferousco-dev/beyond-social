"use client";

import { Captions, Film, Image as ImageIcon, Music, Type, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useStudio, type ToolTab } from "../store/editor-store";
import { AssetsPanel } from "./panels/assets-panel";
import { MediaPanel } from "./panels/media-panel";

// Panels other than the first load when their tab opens, which keeps the editor's first download smaller.
const Fallback = (): ReactNode => <div className="m-3 h-24 animate-pulse rounded-lg bg-cloud" aria-hidden />;
const CaptionsPanel = dynamic(() => import("./panels/captions-panel").then((m) => m.CaptionsPanel), { loading: Fallback });
const MusicPanel = dynamic(() => import("./panels/music-panel").then((m) => m.MusicPanel), { loading: Fallback });
const TextPanel = dynamic(() => import("./panels/text-panel").then((m) => m.TextPanel), { loading: Fallback });

const TOOLS: ReadonlyArray<{ id: ToolTab; label: string; Icon: LucideIcon }> = [
  { id: "media", label: "Media", Icon: Film },
  { id: "captions", label: "Captions", Icon: Captions },
  { id: "text", label: "Text", Icon: Type },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "music", label: "Music", Icon: Music },
];

/** The icon rail and the panel it opens, side by side. */
export function ToolPanel(): ReactNode {
  const tool = useStudio((s) => s.tool);
  const setTool = useStudio((s) => s.setTool);
  const active = TOOLS.find((t) => t.id === tool) ?? TOOLS[0]!;

  return (
    <section aria-label="Tools" className="flex h-full min-h-0 overflow-hidden rounded-md border border-hairline bg-paper">
      <nav aria-label="Tool" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-hairline py-2">
        {TOOLS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === id}
            onClick={() => setTool(id)}
            className={cn("inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary [&_svg]:size-4", tool === id && "bg-cloud text-ink")}
          >
            <Icon aria-hidden />
          </button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="flex h-11 shrink-0 items-center border-b border-hairline px-3 text-sm text-ink-soft">{active.label}</h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {panel(active.id)}
        </div>
      </div>
    </section>
  );
}

function panel(tool: ToolTab): ReactNode {
  switch (tool) {
    case "media":
      return <MediaPanel />;
    case "captions":
      return <CaptionsPanel />;
    case "text":
      return <TextPanel />;
    case "images":
      return <AssetsPanel kind="image" />;
    case "music":
      return <MusicPanel />;
  }
}
