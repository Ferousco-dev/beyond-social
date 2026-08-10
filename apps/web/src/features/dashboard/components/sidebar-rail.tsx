"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LibraryBig, MessageSquare, PanelLeft, PenSquare, TrendingUp } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { type DashboardUser, type SidebarProject } from "@/lib/dashboard/data";

import { UserButton } from "./user-button";

/**
 * The collapsed sidebar.
 *
 * Collapsing used to hide the sidebar outright and scatter three of its
 * controls into the top bar, which meant the projects list became unreachable
 * without expanding again. The rail keeps every destination in place at icon
 * width, and puts the projects behind a flyout so the list is one click away
 * rather than one layout change away.
 */

const RAIL_ITEM =
  "inline-flex size-9 items-center justify-center rounded-lg text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:size-11";

const LINKS = [
  { href: "/dashboard", label: "New project", icon: PenSquare },
  { href: "/dashboard/library", label: "Library", icon: LibraryBig },
  { href: "/dashboard/trends", label: "Discover", icon: TrendingUp },
] as const;

export function SidebarRail({
  user,
  projects,
  onExpand,
}: {
  user: DashboardUser;
  projects: readonly SidebarProject[];
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
        className={`${RAIL_ITEM} group relative`}
      >
        <span className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
          <Logo showWordmark={false} className="[&_span]:size-6" />
        </span>
        <PanelLeft className="size-5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>

      <div className="mt-2 flex flex-col gap-1">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href as Route} title={link.label} className={RAIL_ITEM}>
            <link.icon className="size-5" aria-hidden />
            <span className="sr-only">{link.label}</span>
          </Link>
        ))}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger title="Projects" className={RAIL_ITEM}>
            <MessageSquare className="size-5" aria-hidden />
            <span className="sr-only">Projects</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="right"
              align="start"
              sideOffset={8}
              className="z-50 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-hairline bg-paper p-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left-1"
            >
              <DropdownMenu.Label className="px-2.5 py-2 text-xs font-medium text-ink-soft">
                Recents
              </DropdownMenu.Label>
              {projects.length === 0 ? (
                <p className="px-2.5 pb-2 text-sm text-ink-soft">Nothing here yet.</p>
              ) : (
                projects.map((project) => (
                  <DropdownMenu.Item key={project.id} asChild>
                    <Link
                      href={`/dashboard/c/${project.id}` as Route}
                      className="block cursor-pointer truncate rounded-lg px-2.5 py-2 text-sm text-ink outline-none transition-colors data-highlighted:bg-cloud"
                    >
                      {project.title}
                    </Link>
                  </DropdownMenu.Item>
                ))
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* The same account menu as the expanded sidebar, so collapsing does not
          change what the row can do. */}
      <div className="mt-auto w-full px-1.5">
        <UserButton user={user} compact />
      </div>
    </div>
  );
}
