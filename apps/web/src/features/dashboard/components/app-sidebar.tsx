import { PanelLeft, PenSquare, Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { PROJECT_GROUPS, type DashboardUser } from "@/lib/dashboard/data";

import { UserButton } from "./user-button";

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
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-cloud"
        >
          <PenSquare className="size-4" />
          New project
        </Link>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm text-ink transition-colors hover:bg-cloud"
        >
          <Search className="size-4" />
          Search projects
        </button>
      </div>

      <nav aria-label="Projects" className="mt-4 flex-1 overflow-y-auto px-2">
        {PROJECT_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2.5 pb-1 text-xs font-medium text-ink-soft">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/dashboard/c/${project.id}`}
                    onClick={onNavigate}
                    className="block w-full cursor-pointer truncate rounded-[10px] px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-cloud"
                  >
                    {project.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <UserButton user={user} />
    </div>
  );
}
