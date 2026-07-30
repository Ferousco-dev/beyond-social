"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search, Sparkle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { type DashboardUser, type SidebarProject } from "@/lib/dashboard/data";

import { AppSidebar } from "./app-sidebar";
import { SidebarRail } from "./sidebar-rail";
import { CommandPalette } from "./command-palette";
import { RouteProgress } from "./route-progress";
import { WorkspaceMenu } from "./workspace-menu";

export function DashboardShell({
  user,
  projects,
  children,
}: {
  user: DashboardUser;
  projects: readonly SidebarProject[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // The workspace is a dark "operating environment" regardless of the global
    // theme; the `dark` class scopes the dark token set to this subtree.
    <div className="flex h-dvh bg-canvas pl-safe pr-safe text-ink">
      {/* Collapsing narrows the sidebar to a rail rather than removing it. The
          width is transitioned so the content beside it slides rather than
          jumping, and the swap between the two is a cross-fade at the same
          duration. Both are suppressed under reduced motion. */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-hairline transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
          collapsed ? "w-14" : "w-[260px]",
        )}
      >
        {collapsed ? (
          <SidebarRail user={user} projects={projects} onExpand={() => setCollapsed(false)} />
        ) : (
          <AppSidebar user={user} projects={projects} onCollapse={() => setCollapsed(true)} />
        )}
      </aside>

      {/* A real dialog rather than a positioned div: on a phone this is the only
          way to the whole navigation, and the hand-rolled version had no focus
          trap, no Escape, and left the page behind it scrollable under the
          overlay. */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
          <Dialog.Content
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r border-hairline bg-paper pb-safe pl-safe outline-none lg:hidden"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <AppSidebar user={user} projects={projects} onNavigate={() => setDrawerOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex min-h-12 shrink-0 items-center gap-1 px-2.5 pt-safe">
          <RouteProgress />

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors pointer-coarse:size-11 hover:bg-cloud lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          {/* The logo, the expand control and New project used to be copied up
              here whenever the sidebar collapsed. The rail holds all three now,
              so the top bar keeps one job. */}
          <WorkspaceMenu />

          <div className="ml-auto flex items-center gap-2">
            {/* One trigger, two shapes. It used to be hidden below `sm`, which
                left search reachable only by a keyboard shortcut, so on a phone
                there was no way to reach it at all. */}
            <CommandPalette projects={projects}>
              <button
                type="button"
                aria-label="Search or run a command"
                className="inline-flex size-9 items-center justify-center rounded-lg text-ink-soft transition-colors pointer-coarse:size-11 hover:bg-cloud hover:text-ink sm:size-auto sm:gap-2 sm:rounded-lg sm:border sm:border-hairline sm:bg-paper sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                <Search className="size-5 sm:size-3.5" />
                <span className="hidden sm:inline">Search or run a command</span>
                <kbd className="hidden rounded border border-hairline px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                  ⌘K
                </kbd>
              </button>
            </CommandPalette>

            {/* Was href="#", so the upgrade call to action did nothing at all.
                Padded to a real tap target too: it was 20px tall. */}
            <a
              href="/dashboard/settings/billing"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Sparkle className="size-4 fill-current" aria-hidden />
              Upgrade
            </a>
          </div>
        </header>

        <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
