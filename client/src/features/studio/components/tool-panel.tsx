"use client";

import { Film, Type, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { useStudio, type ToolTab } from "../store/editor-store";
import { MediaPanel } from "./panels/media-panel";
import { TextPanel } from "./panels/text-panel";

const TOOLS: ReadonlyArray<{ id: ToolTab; label: string; Icon: LucideIcon }> = [
  { id: "media", label: "Media", Icon: Film },
  { id: "text", label: "Text", Icon: Type },
];

/** The icon rail and the panel it opens, side by side. */
export function ToolPanel({ library }: { library: readonly LibraryItem[] }): ReactNode {
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
          {active.id === "media" ? <MediaPanel library={library} /> : <TextPanel />}
        </div>
      </div>
    </section>
  );
}
