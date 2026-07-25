"use client";

import { Menu, PanelLeft, Sparkle, SquarePen } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { type DashboardUser, type SidebarProject } from "@/lib/dashboard/data";

import { AppSidebar } from "./app-sidebar";
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
    <div className="dark flex h-dvh bg-canvas text-ink">
      <aside
        className={cn(
          "shrink-0 border-r border-hairline",
          collapsed ? "hidden" : "hidden w-[260px] lg:block",
        )}
      >
        <AppSidebar user={user} projects={projects} onCollapse={() => setCollapsed(true)} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] border-r border-hairline">
            <AppSidebar user={user} projects={projects} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-12 shrink-0 items-center gap-1 px-2.5">
          <RouteProgress />

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          {collapsed ? (
            <div className="hidden items-center gap-1 lg:flex">
              <span className="px-1">
                <Logo showWordmark={false} />
              </span>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Open sidebar"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud"
              >
                <PanelLeft className="size-5" />
              </button>
              <Link
                href="/dashboard"
                aria-label="New project"
                className="inline-flex size-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud"
              >
                <SquarePen className="size-5" />
              </Link>
            </div>
          ) : null}

          <WorkspaceMenu />

          <a
            href="#"
            className="ml-auto inline-flex items-center gap-1.5 px-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            <Sparkle className="size-4 fill-current" />
            Upgrade
          </a>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
