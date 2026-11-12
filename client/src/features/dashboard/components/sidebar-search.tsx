"use client";

import { Search } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CommandPalette } from "./command-palette";

/**
 * Search lives at the top of the sidebar, where people look for it. It opens the
 * command palette (also reachable with Cmd or Ctrl K), so one surface still
 * searches, navigates and acts.
 */
export function SidebarSearch({ collapsed = false }: { collapsed?: boolean }): ReactNode {
  return (
    <CommandPalette>
      <button
        type="button"
        aria-label="Search or run a command"
        title={collapsed ? "Search" : undefined}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center rounded-[10px] border border-hairline bg-canvas text-[15px] text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          collapsed ? "justify-center" : "gap-2.5 px-2.5",
        )}
      >
        <Search className="shrink-0" size={17} strokeWidth={1.5} aria-hidden />
        {collapsed ? null : (
          <>
            <span className="flex-1 truncate text-left">Search</span>
            <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
          </>
        )}
      </button>
    </CommandPalette>
  );
}
