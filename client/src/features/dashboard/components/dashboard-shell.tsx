"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import { UndoToaster } from "@/components/ui/undo-toast";
import { type Credits, type DashboardUser, type SidebarProject } from "@/lib/dashboard/data";

import { AppSidebar, DrawerSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { RouteProgress } from "./route-progress";
import { WorkspaceMenu } from "./workspace-menu";

export function DashboardShell({
  user,
  credits,
  projects,
  children,
}: {
  user: DashboardUser;
  credits: Credits | null;
  projects: Promise<readonly SidebarProject[]>;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // The workspace is a dark "operating environment" regardless of the global
    // theme; the `dark` class scopes the dark token set to this subtree.
    // The marker lets the document itself adopt this surface, so an overscroll
    // bounce shows the workspace colour rather than the page behind it.
    <div data-surface="workspace" className="flex h-dvh bg-canvas pl-safe pr-safe text-ink">
      <AppSidebar user={user} credits={credits} projects={projects} />

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
            <DrawerSidebar
              user={user}
              credits={credits}
              projects={projects}
              onNavigate={() => setDrawerOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col transition-[padding] duration-200 motion-reduce:transition-none lg:pl-[var(--sidebar-w,276px)]">
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
            {/* On desktop, search lives in the sidebar. Below that width the
                sidebar is a drawer, so a search icon stays in the top bar. */}
            <div className="lg:hidden">
              <CommandPalette>
                <button
                  type="button"
                  aria-label="Search or run a command"
                  className="inline-flex size-9 items-center justify-center rounded-lg text-ink-soft transition-colors pointer-coarse:size-11 hover:bg-cloud hover:text-ink"
                >
                  <Search className="size-5" />
                </button>
              </CommandPalette>
            </div>

          </div>
        </header>

        {/*
         * `relative` is load-bearing, not decoration.
         *
         * `sr-only` positions absolutely, and an absolutely positioned element
         * resolves against its nearest positioned ancestor. Without one here,
         * screen-reader-only captions deep in the scrolled content resolved
         * against the document instead: a 1px element sitting at its static
         * offset three thousand pixels down, which the document then had to
         * grow to contain. The page scrolled into empty space with nothing
         * visible in it.
         *
         * The scroll container is the right containing block for its own
         * content, so declaring it fixes every such case at once rather than
         * one caption at a time.
         */}
        <main id="main" className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
          <UndoToaster />
        </main>
      </div>

    </div>
  );
}
