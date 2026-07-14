import { LayoutDashboard, PanelLeft, PenSquare, Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type DashboardUser } from "@/lib/dashboard/data";

import { SearchDialog } from "./search-dialog";
import { SidebarProjects } from "./sidebar-projects";
import { UserButton } from "./user-button";

const NAV_ITEM =
  "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink transition-colors hover:bg-cloud";

export function AppSidebar({
  user,
  onNavigate,
  onCollapse,
}: {
  user: DashboardUser;
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
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            <PanelLeft className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        <Link href="/dashboard" onClick={onNavigate} className={`${NAV_ITEM} font-medium`}>
          <PenSquare className="size-4" />
          New project
        </Link>
        <SearchDialog>
          <button type="button" className={NAV_ITEM}>
            <Search className="size-4" />
            Search projects
            <kbd className="ml-auto hidden rounded border border-hairline px-1.5 py-0.5 text-[10px] font-medium text-ink-soft sm:inline">
              ⌘K
            </kbd>
          </button>
        </SearchDialog>
        <Link href="/dashboard/overview" onClick={onNavigate} className={NAV_ITEM}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
      </div>

      <nav aria-label="Projects" className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
        <SidebarProjects onNavigate={onNavigate} />
      </nav>

      <UserButton user={user} />
    </div>
  );
}
