"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type Credits, type DashboardUser, type SidebarProject } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { useSidebar } from "../hooks/use-sidebar";
import { SidebarNav } from "./sidebar-nav";
import { SidebarProjects } from "./sidebar-projects";
import { SidebarSearch } from "./sidebar-search";
import { SidebarUsageCard } from "./sidebar-usage-card";
import { UserButton } from "./user-button";

interface SidebarProps {
  readonly user: DashboardUser;
  readonly credits: Credits | null;
  readonly projects: Promise<readonly SidebarProject[]>;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * The desktop sidebar: a floating card down the left edge that narrows to icons.
 * Its width is the `--sidebar-w` variable, which the content beside it also reads.
 * The account row sits under the card.
 */
export function AppSidebar({ user, credits, projects }: SidebarProps): ReactNode {
  const { collapsed, toggle } = useSidebar();
  return (
    <aside
      aria-label="Sidebar"
      style={{ width: "var(--sidebar-w, 276px)" }}
      className="fixed inset-y-0 left-0 z-30 hidden flex-col p-1.5 transition-[width] duration-200 motion-reduce:transition-none lg:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-hairline bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className={cn("flex h-[54px] shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-[18px] pr-3.5")}>
          {collapsed ? null : <Logo />}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn("flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink", FOCUS)}
          >
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} aria-hidden /> : <PanelLeftClose size={18} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>

        <div className="px-2.5 pb-2">
          <SidebarSearch collapsed={collapsed} />
        </div>

        <SidebarNav collapsed={collapsed} />
        <SidebarProjects items={projects} collapsed={collapsed} />
        {credits && !collapsed ? <SidebarUsageCard credits={credits} /> : null}
      </div>

      <div className={cn("shrink-0 pt-1", collapsed ? "px-0" : "px-1")}>
        <UserButton user={user} compact={collapsed} bare />
      </div>
    </aside>
  );
}

/** The same sidebar inside the phone drawer, full height with no collapse control. */
export function DrawerSidebar({ user, credits, projects, onNavigate }: SidebarProps & { readonly onNavigate: () => void }): ReactNode {
  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex h-[54px] shrink-0 items-center px-[18px]">
        <Logo />
      </div>
      <div className="px-2.5 pb-2">
        <SidebarSearch />
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <SidebarProjects items={projects} onNavigate={onNavigate} />
      {credits ? <SidebarUsageCard credits={credits} /> : null}
      <UserButton user={user} />
    </div>
  );
}
