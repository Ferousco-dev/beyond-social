"use client";

import { type ReactNode } from "react";

import { type SidebarProject } from "@/lib/dashboard/data";

import { SidebarProjectRow } from "./sidebar-project-row";

export function SidebarProjects({
  items,
  onNavigate,
}: {
  items: readonly SidebarProject[];
  onNavigate?: () => void;
}): ReactNode {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
      <h2 className="px-2 pb-2 text-xs font-medium text-ink-soft">Your work</h2>
      {items.length === 0 ? (
        <p className="px-2 py-1 text-xs text-ink-soft">Your projects and chats will appear here.</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => <SidebarProjectRow key={`${item.kind}:${item.id}`} item={item} onNavigate={onNavigate} />)}
        </ul>
      )}
    </div>
  );
}