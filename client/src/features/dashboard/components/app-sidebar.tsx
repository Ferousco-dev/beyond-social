import { PanelLeft } from "lucide-react";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type Credits, type DashboardUser } from "@/lib/dashboard/data";

import { SidebarNav } from "./sidebar-nav";
import { SidebarUsageCard } from "./sidebar-usage-card";
import { UserButton } from "./user-button";

export function AppSidebar({
  user,
  credits,
  onNavigate,
  onCollapse,
}: {
  user: DashboardUser;
  credits: Credits | null;
  onNavigate?: () => void;
  onCollapse?: () => void;
}): ReactNode {
  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="px-1">
          <Logo />
        </div>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="inline-flex size-8 cursor-pointer pointer-coarse:size-11 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            <PanelLeft className="size-4" />
          </button>
        ) : null}
      </div>

      <SidebarNav onNavigate={onNavigate} />

      <div className="min-h-0 flex-1" />

      {credits ? <SidebarUsageCard credits={credits} /> : null}
      <UserButton user={user} />
    </div>
  );
}
