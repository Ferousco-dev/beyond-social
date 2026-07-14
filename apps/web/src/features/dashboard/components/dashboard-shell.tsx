"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type DashboardUser } from "@/lib/dashboard/data";

import { AppSidebar } from "./app-sidebar";

export function DashboardShell({ user, children }: { user: DashboardUser; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <aside className="hidden w-[260px] shrink-0 border-r border-hairline lg:block">
        <AppSidebar user={user} />
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
            <AppSidebar user={user} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-hairline px-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-cloud"
          >
            <Menu className="size-5" />
          </button>
          <Logo showWordmark={false} />
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
