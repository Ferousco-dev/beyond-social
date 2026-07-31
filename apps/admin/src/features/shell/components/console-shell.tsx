"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { routeFor } from "../nav";
import { type AdminIdentity } from "../types";

import { ConsoleRail } from "./console-rail";
import { ConsoleSidebar } from "./console-sidebar";
import { ConsoleWordmark } from "./console-wordmark";
import { NavDrawer } from "./nav-drawer";

export function ConsoleShell({
  admin,
  children,
}: {
  admin: AdminIdentity | null;
  children: ReactNode;
}): ReactNode {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const current = routeFor(pathname);

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      {/* Collapsing narrows the sidebar to a rail rather than removing it. The
          width is transitioned so the content beside it slides rather than
          jumping, and it is suppressed under reduced motion. */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-hairline transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
          collapsed ? "w-14" : "w-[260px]",
        )}
      >
        {collapsed ? (
          <ConsoleRail onExpand={() => setCollapsed(false)} />
        ) : (
          <ConsoleSidebar admin={admin} onCollapse={() => setCollapsed(true)} />
        )}
      </aside>

      <NavDrawer open={drawerOpen} admin={admin} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-hairline px-2.5 lg:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors pointer-coarse:size-11 hover:bg-cloud lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <span className="lg:hidden">
            <ConsoleWordmark />
          </span>

          {/* On a wide viewport the sidebar already carries the brand, so the
              bar names the section instead of repeating it. */}
          <span className="hidden text-sm font-medium text-ink lg:inline">
            {current ? current.label : "Console"}
          </span>

          <span className="ml-auto text-xs text-ink-soft">Internal use only</span>
        </header>

        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
