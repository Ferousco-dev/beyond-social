"use client";

import { CircleHelp, EllipsisVertical, Plus, Search, Settings, SlidersHorizontal } from "lucide-react";

interface WorkspaceTopbarProps {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onOpenAssets: () => void;
}

const ICON_BUTTON =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function WorkspaceTopbar({ query, onQueryChange, onOpenAssets }: WorkspaceTopbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
      <div className="relative mx-auto w-full max-w-xl flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search takes and timeline"
          aria-label="Search takes and timeline"
          className="h-10 w-full rounded-full border border-hairline bg-paper pl-9 pr-4 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
      </div>

      <button type="button" onClick={onOpenAssets} aria-label="Filter assets" className={ICON_BUTTON}>
        <SlidersHorizontal className="size-4" aria-hidden />
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" aria-label="New take" className={ICON_BUTTON}>
          <Plus className="size-5" aria-hidden />
        </button>
        <button type="button" aria-label="Help" className={ICON_BUTTON}>
          <CircleHelp className="size-5" aria-hidden />
        </button>
        <button type="button" aria-label="Workspace settings" className={ICON_BUTTON}>
          <Settings className="size-5" aria-hidden />
        </button>
        <button type="button" aria-label="More options" className={ICON_BUTTON}>
          <EllipsisVertical className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
