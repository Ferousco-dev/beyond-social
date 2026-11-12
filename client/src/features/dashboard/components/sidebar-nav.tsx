"use client";

import {
  CalendarClock,
  CircleUser,
  Film,
  LineChart,
  PenSquare,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

/** Shared shape so the search trigger sits flush with the real links. */
const ITEM =
  "group flex h-9 w-full cursor-pointer items-center rounded-[10px] text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

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
    href: "/dashboard/new" as Route,
    label: "New Video",
    icon: PenSquare,
    motion: "group-hover:-translate-y-px group-hover:-rotate-12",
    exact: true,
  },
  {
    href: "/dashboard/assets" as Route,
    label: "Assets",
    icon: CircleUser,
    // Faces, voices, products and places: the page is called Assets, so the link says so.
    motion: "group-hover:scale-110",
  },
  {
    href: "/dashboard/projects" as Route,
    label: "Projects",
    icon: Film,
    motion: "group-hover:scale-110",
  },
  {
    href: "/dashboard/schedule" as Route,
    label: "Schedule",
    icon: CalendarClock,
    // A clock hand advancing, which is the one thing this page is about.
    motion: "group-hover:rotate-12",
  },
  {
    href: "/dashboard/analytics" as Route,
    label: "Analytics",
    icon: LineChart,
    motion: "group-hover:scale-110",
  },
  {
    href: "/dashboard/trends" as Route,
    label: "Discover",
    icon: TrendingUp,
    motion: "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
  },
];

/** The sidebar's destinations. Search sits above them, in the sidebar itself. */
export function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();

  // Setting up a video is a step of New Video, so that item stays marked while the form is open.
  const isActive = (link: NavLink): boolean =>
    link.exact ? pathname === link.href || pathname.startsWith("/dashboard/videos") : pathname.startsWith(link.href);

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2.5">
      {LINKS.map((link) => {
        const active = isActive(link);
        return (
          <Fragment key={link.href}>
            <Link
              href={link.href}
              // Fetched in full ahead of the click, so the page is already here.
              prefetch
              onClick={onNavigate}
              data-tip-anchor={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              aria-current={active ? "page" : undefined}
              title={collapsed ? link.label : undefined}
              className={cn(
                ITEM,
                collapsed ? "justify-center" : "gap-2.5 px-2",
                active ? "bg-primary/10 font-semibold text-ink" : "text-ink hover:bg-cloud",
              )}
            >
              <link.icon
                className={cn("shrink-0", MOTION, link.motion, active && "text-primary")}
                size={17}
                aria-hidden
                strokeWidth={1.5}
              />
              {collapsed ? <span className="sr-only">{link.label}</span> : <span className="truncate">{link.label}</span>}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
