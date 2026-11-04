"use client";

import { Sparkles, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { AiPanel } from "./panels/ai-panel";
import { InspectorPanel } from "./panels/inspector-panel";

type Tab = "inspector" | "ai";

const TABS: ReadonlyArray<{ id: Tab; label: string; Icon: LucideIcon }> = [
  { id: "inspector", label: "Inspector", Icon: SlidersHorizontal },
  { id: "ai", label: "AI", Icon: Sparkles },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("inspector");
  return (
    <section aria-label="Inspector and assistant" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
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
