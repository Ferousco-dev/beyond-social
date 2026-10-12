"use client";

import { CircleHelp, EllipsisVertical, Plus, Search, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { type Route } from "next";
import { useState } from "react";

interface WorkspaceTopbarProps {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly onOpenAssets: () => void;
}

const ICON_BUTTON =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function WorkspaceTopbar({ query, onQueryChange, onOpenAssets }: WorkspaceTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <Link href={"/dashboard/c/new" as Route} aria-label="New take" className={ICON_BUTTON}>
          <Plus className="size-5" aria-hidden />
        </Link>
        <Link href={"/help" as Route} aria-label="Help" className={ICON_BUTTON}>
          <CircleHelp className="size-5" aria-hidden />
        </Link>
        <Link
          href={"/dashboard/settings" as Route}
          aria-label="Workspace settings"
          className={ICON_BUTTON}
        >
          <Settings className="size-5" aria-hidden />
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More options"
            className={ICON_BUTTON}
          >
            <EllipsisVertical className="size-5" aria-hidden />
          </button>
          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-hairline bg-paper p-1 shadow-card"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAssets();
                  }}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-cloud"
                >
                  Browse assets
                </button>
                <Link
                  href={"/dashboard/library" as Route}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-cloud"
                >
                  View library
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
