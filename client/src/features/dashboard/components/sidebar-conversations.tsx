"use client";

import { type Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { type SidebarProject } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

/** Recent chats, newest first. */
export function SidebarConversations({
  items,
  onNavigate,
}: {
  readonly items: readonly SidebarProject[];
  readonly onNavigate?: () => void;
}): ReactNode {
  const pathname = usePathname();

  if (items.length === 0) {
    return <p className="px-3 text-sm text-ink-soft">Your chats will appear here.</p>;
  }

  return (
    <>
      <h2 className="px-3 pb-1.5 text-xs font-medium text-ink-soft">Recent</h2>
      <ul>
        {items.map((item) => {
          const href = `/dashboard/c/${item.id}`;
          const active = pathname === href;
          return (
            <li key={item.id}>
              <Link
                href={href as Route}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block truncate rounded-[10px] px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:bg-cloud hover:text-ink",
                )}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
