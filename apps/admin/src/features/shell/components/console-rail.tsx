"use client";

import { PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { CONSOLE_GROUPS, isActiveRoute } from "../nav";

/**
 * The collapsed sidebar. Collapsing narrows the navigation to icon width rather
 * than removing it, so every section stays one click away and the active one
 * stays visible.
 *
 * The groups survive the collapse as hairline rules. At icon width a label
 * cannot be shown, and ten identical squares in a column is exactly the state
 * where an operator stops reading and starts guessing.
 */

const RAIL_ITEM =
  "inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:size-11";

export function ConsoleRail({ onExpand }: { onExpand: () => void }): ReactNode {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col items-center gap-1 overflow-y-auto bg-paper py-3">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open sidebar"
        className={cn(RAIL_ITEM, "cursor-pointer text-ink-soft hover:text-ink")}
      >
        <PanelLeft className="size-5" aria-hidden />
      </button>

      <div className="mt-2 flex flex-col items-center">
        {CONSOLE_GROUPS.map((group) => (
          <nav
            key={group.label}
            aria-label={group.label}
            className="mt-3 flex flex-col gap-1 border-t border-hairline pt-3 first:mt-0 first:border-t-0 first:pt-0"
          >
            {group.routes.map((route) => {
              const active = isActiveRoute(route, pathname);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={route.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    RAIL_ITEM,
                    active ? "bg-cloud text-ink" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <route.icon className="size-5" aria-hidden strokeWidth={active ? 2.25 : 2} />
                  <span className="sr-only">{route.label}</span>
                </Link>
              );
            })}
          </nav>
        ))}
      </div>
    </div>
  );
}
