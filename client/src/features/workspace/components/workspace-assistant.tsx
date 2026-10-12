"use client";

import { LayoutDashboard, Lightbulb, Menu, SquarePen, Wand2, X } from "lucide-react";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

interface WorkspaceAssistantProps {
  readonly title: string;
  readonly userName: string;
  readonly isEmpty: boolean;
  readonly children: ReactNode;
  readonly onOpenAssets: () => void;
}

const STARTERS = [
  {
    icon: Wand2,
    label: "Turn a concept into prompts",
    prompt: "Turn this concept into a shot-by-shot prompt list: ",
  },
  {
    icon: Lightbulb,
    label: "Brainstorm with me",
    prompt: "Brainstorm video ideas with me about: ",
  },
  {
    icon: LayoutDashboard,
    label: "Build a visual moodboard",
    prompt: "Describe a visual moodboard for: ",
  },
] as const;

export function WorkspaceAssistant({
  title,
  userName,
  isEmpty,
  children,
  onOpenAssets,
}: WorkspaceAssistantProps) {
  return (
    <aside
      aria-label="Assistant"
      className="flex h-full w-full shrink-0 flex-col border-l border-hairline bg-paper lg:w-[380px]"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2.5">
        <Menu className="size-4 text-ink-soft" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</h2>
        <button
          type="button"
          onClick={onOpenAssets}
          aria-label="Browse assets"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <SquarePen className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Close assistant"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      {isEmpty ? (
        <div className="px-5 pb-2 pt-10 text-center">
          <p className="text-lg text-ink-soft">Hi {userName}</p>
          <p className="mt-1 text-xl text-ink">What would you like to create?</p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>

      {isEmpty ? (
        <ul className="space-y-2 px-4 pb-3">
          {STARTERS.map((starter) => (
            <li key={starter.label}>
              <Link
                href={
                  `/dashboard/c/new?prompt=${encodeURIComponent(starter.prompt)}` as Route
                }
                className="flex items-center gap-3 rounded-2xl border border-hairline bg-cloud/60 p-2 pr-4 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper">
                  <starter.icon className="size-5 text-ink" aria-hidden />
                </span>
                <span className="text-sm font-medium text-ink">{starter.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
