"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { CONSOLE_GROUPS, isActiveRoute } from "../nav";

const ITEM =
  "group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * The expanded sidebar navigation.
 *
 * Each group is its own landmark carrying the group's name, so the list reads
 * as three short menus rather than ten undifferentiated links. The visible
 * heading is hidden from assistive technology because the landmark already
 * announces the same word.
 */
export function ConsoleNav({ onNavigate }: { onNavigate?: () => void }): ReactNode {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      {CONSOLE_GROUPS.map((group) => (
        <nav key={group.label} aria-label={group.label} className="flex flex-col gap-0.5 px-2">
          <h2
            aria-hidden
            className="px-3 pb-1 text-[0.6875rem] font-medium tracking-wide text-ink-soft uppercase"
          >
            {group.label}
          </h2>

          {group.routes.map((route) => {
            const active = isActiveRoute(route, pathname);
            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  ITEM,
                  active ? "bg-cloud font-medium text-ink" : "text-ink hover:bg-cloud",
                )}
              >
                <route.icon
                  className="size-4 shrink-0"
                  aria-hidden
                  strokeWidth={active ? 2.25 : 2}
                />
                {route.label}
              </Link>
            );
          })}
        </nav>
      ))}
    </div>
  );
}
