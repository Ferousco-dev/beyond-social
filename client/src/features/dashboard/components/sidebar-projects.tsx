"use client";

import { Suspense, use, type ReactNode } from "react";

import { type SidebarProject } from "@/lib/dashboard/data";

import { SidebarProjectRow } from "./sidebar-project-row";

export function SidebarProjects({
  items,
  onNavigate,
  collapsed = false,
}: {
  items: Promise<readonly SidebarProject[]>;
  onNavigate?: () => void;
  collapsed?: boolean;
}): ReactNode {
  // Narrowed to icons there is no room for titles, so the list steps aside and the space stays.
  if (collapsed) return <div className="min-h-0 flex-1" />;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-5">
      <h2 className="px-3.5 pb-1.5 text-[14px] text-ink-soft">Your work</h2>
      {/* The page does not wait for these requests: the list fills in when they land. */}
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectList items={items} onNavigate={onNavigate} />
      </Suspense>
    </div>
  );
}

function ProjectsSkeleton(): ReactNode {
  return (
    <ul className="space-y-1.5 px-2 pt-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((row) => (
        <li key={row} className="h-7 animate-pulse rounded-lg bg-cloud" />
      ))}
    </ul>
  );
}

function ProjectList({ items, onNavigate }: { items: Promise<readonly SidebarProject[]>; onNavigate?: () => void }): ReactNode {
  const list = use(items);
  return list.length === 0 ? (
    <p className="px-2 py-1 text-xs text-ink-soft">Videos you make will appear here.</p>
  ) : (
    <ul className="space-y-0.5">
      {list.map((item) => (
        <SidebarProjectRow key={`${item.kind}:${item.id}`} item={item} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}
