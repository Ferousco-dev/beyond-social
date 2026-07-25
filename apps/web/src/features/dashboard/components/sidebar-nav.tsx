"use client";

import { LayoutDashboard, PenSquare, Search, TrendingUp, type LucideIcon } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { type SidebarProject } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { SearchDialog } from "./search-dialog";

/** Shared shape so the search trigger sits flush with the real links. */
const ITEM =
  "group flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Each icon moves the way its own metaphor suggests, which keeps the motion
 * meaningful rather than decorative. Suppressed under reduced motion.
 */
const MOTION =
  "transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none";

interface NavLink {
  readonly href: Route;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly motion: string;
  /** Home is only active on an exact match, since every route sits under it. */
  readonly exact?: boolean;
}

const LINKS: readonly NavLink[] = [
  {
    href: "/dashboard" as Route,
    label: "New project",
    icon: PenSquare,
    motion: "group-hover:-translate-y-px group-hover:-rotate-12",
    exact: true,
  },
  {
    href: "/dashboard/overview" as Route,
    label: "Dashboard",
    icon: LayoutDashboard,
    motion: "group-hover:scale-110",
  },
  {
    href: "/dashboard/trends" as Route,
    label: "Trends",
    icon: TrendingUp,
    motion: "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
  },
];

export function SidebarNav({
  projects,
  onNavigate,
}: {
  projects: readonly SidebarProject[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (link: NavLink): boolean =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {LINKS.map((link, index) => {
        const active = isActive(link);
        return (
          <Fragment key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                ITEM,
                active ? "bg-cloud font-medium text-ink" : "text-ink hover:bg-cloud",
                link.exact && "font-medium",
              )}
            >
              <link.icon
                className={cn("size-4 shrink-0", MOTION, link.motion)}
                aria-hidden
                strokeWidth={active ? 2.25 : 2}
              />
              {link.label}
            </Link>

            {/* Search sits directly under the primary action, as before. */}
            {index === 0 ? (
              <SearchDialog projects={projects}>
                <button type="button" className={cn(ITEM, "text-ink hover:bg-cloud")}>
                  <Search
                    className={cn("size-4 shrink-0", MOTION, "group-hover:scale-110")}
                    aria-hidden
                  />
                  Search projects
                  <kbd className="ml-auto hidden rounded border border-hairline px-1.5 py-0.5 text-[10px] font-medium text-ink-soft sm:inline">
                    ⌘K
                  </kbd>
                </button>
              </SearchDialog>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
