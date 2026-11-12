"use client";

import { Sparkles, SlidersHorizontal, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { AiPanel } from "./panels/ai-panel";
const InspectorPanel = dynamic(() => import("./panels/inspector-panel").then((m) => m.InspectorPanel), {
  loading: () => <div className="m-3 h-32 animate-pulse rounded-lg bg-cloud" aria-hidden />,
});

type Tab = "inspector" | "ai";

const TABS: ReadonlyArray<{ id: Tab; label: string; Icon: LucideIcon }> = [
  { id: "ai", label: "Chat", Icon: Sparkles },
  { id: "inspector", label: "Editor", Icon: SlidersHorizontal },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("inspector");
  return (
    <section aria-label="Chat and editor" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
      <div role="tablist" className="flex h-11 shrink-0 items-center gap-1 border-b border-hairline px-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary [&_svg]:size-4", tab === id ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink")}
          >
            <Icon aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{tab === "inspector" ? <InspectorPanel /> : <AiPanel />}</div>
    </section>
  );
}
