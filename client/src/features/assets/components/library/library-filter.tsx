"use client";

import { LayoutGrid, Mic, Package, Search, UserRound } from "lucide-react";
import { type ComponentType, type ReactNode } from "react";

/**
 * Which resources are on screen, and a search that narrows them.
 *
 * Both really filter. The design this follows had a tab strip and a search box
 * beside it, and either could have been drawn and left inert; a control that
 * does nothing is worse than a plainer page, because it costs somebody the time
 * to work out that it is broken rather than that they are.
 *
 * Search matches what is actually named in this library: product labels and the
 * names people give their recordings. It is deliberately not a fuzzy search
 * over invented metadata.
 */

export type AssetFilter = "all" | "avatar" | "voice" | "products";

interface Tab {
  readonly id: AssetFilter;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
}

const TABS: readonly Tab[] = [
  { id: "all", label: "All assets", icon: LayoutGrid },
  { id: "avatar", label: "Avatar", icon: UserRound },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "products", label: "Products", icon: Package },
];

export function LibraryFilter({
  active,
  onChange,
  query,
  onQuery,
  counts,
}: {
  active: AssetFilter;
  onChange: (next: AssetFilter) => void;
  query: string;
  onQuery: (next: string) => void;
  counts: Readonly<Record<string, number>>;
}): ReactNode {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="tablist"
        aria-label="Filter assets"
        className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-xl border border-hairline bg-paper p-1 lg:w-auto"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-ink-soft hover:bg-cloud hover:text-ink"
              }`}
            >
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
              {count > 0 ? (
                <span className="rounded-full bg-cloud px-1.5 text-[11px] tabular-nums text-ink-soft">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative w-full lg:w-72">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search your assets by name"
          className="h-10 w-full rounded-xl border border-hairline bg-paper pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
    </div>
  );
}
