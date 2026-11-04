"use client";

import { LibraryBig, PanelLeft, PenSquare, TrendingUp } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type DashboardUser } from "@/lib/dashboard/data";

import { UserButton } from "./user-button";

/**
 * The collapsed sidebar.
 *
 * Collapsing used to hide the sidebar outright and scatter three of its
 * controls into the top bar, which meant the projects list became unreachable
 * without expanding again. The rail keeps every destination in place at icon
 * width while keeping the core creation and discovery destinations visible.
 */

/** Icon above a small label, centred, rather than a bare icon with a tooltip. */
const RAIL_ITEM =
  "flex w-16 cursor-pointer flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const RAIL_LABEL = "text-[11px] leading-none font-medium";

const LINKS = [
  { href: "/dashboard", label: "New", icon: PenSquare },
  { href: "/dashboard/projects", label: "Projects", icon: LibraryBig },
  { href: "/dashboard/trends", label: "Discover", icon: TrendingUp },
] as const;

export function SidebarRail({
  user,
  onExpand,
}: {
  user: DashboardUser;
  onExpand: () => void;
}): ReactNode {
  return (
    <div className="flex h-full flex-col items-center gap-1 bg-paper py-3">
      {/* The mark is the resting state and the control is revealed on hover, so
          the rail reads as the brand until you reach for it. */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open sidebar"
        className="group relative inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          <Logo showWordmark={false} className="[&_span]:size-6" />
        </span>
        <PanelLeft className="size-5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>

      <div className="mt-3 flex flex-col gap-1.5">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href as Route} className={RAIL_ITEM}>
            <link.icon className="size-5" aria-hidden />
            <span className={RAIL_LABEL}>{link.label}</span>
          </Link>
        ))}

      </div>

      {/* The same account menu as the expanded sidebar, so collapsing does not
          change what the row can do. */}
      <div className="mt-auto w-full px-1.5">
        <UserButton user={user} compact />
      </div>
    </div>
  );
}
