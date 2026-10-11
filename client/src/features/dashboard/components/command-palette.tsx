"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Clapperboard,
  CornerDownLeft,
  LayoutDashboard,
  MessagesSquare,
  PenSquare,
  Search,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { type Route } from "next";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { type SidebarProject } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

type Group = "Actions" | "Navigation" | "Projects";

interface Item {
  id: string;
  label: string;
  group: Group;
  icon: LucideIcon;
  href: Route;
  hint?: string;
}

const STATIC_ITEMS: Item[] = [
  {
    id: "new-project",
    label: "New project",
    group: "Actions",
    icon: PenSquare,
    href: "/dashboard" as Route,
    hint: "N",
  },
  {
    id: "new-video",
    label: "Generate a video",
    group: "Actions",
    icon: Clapperboard,
    href: "/dashboard" as Route,
  },
  {
    id: "overview",
    label: "Dashboard",
    group: "Navigation",
    icon: LayoutDashboard,
    href: "/dashboard/overview" as Route,
  },
  {
    id: "trends",
    label: "Trends",
    group: "Navigation",
    icon: TrendingUp,
    href: "/dashboard/trends" as Route,
  },
];

const GROUP_ORDER: Group[] = ["Actions", "Navigation", "Projects"];

/**
 * The workspace command palette (Cmd-K). One surface to act, navigate, and find
 * projects, keyboard-first. This is the signature "operating environment"
 * interaction: nothing here is more than a keystroke away.
 */
export function CommandPalette({
  projects,
  children,
}: {
  projects: readonly SidebarProject[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<Item[]>(() => {
    const projectItems: Item[] = projects.map((p) => ({
      id: `project:${p.id}`,
      label: p.title,
      group: "Projects",
      icon: MessagesSquare,
      href: `/dashboard/c/${p.id}` as Route,
    }));
    const all = [...STATIC_ITEMS, ...projectItems];
    const value = query.trim().toLowerCase();
    return value ? all.filter((item) => item.label.toLowerCase().includes(value)) : all;
  }, [projects, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  const run = (item: Item): void => {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const item = items[activeIndex];
      if (item) run(item);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[12%] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-hairline bg-paper text-ink shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Act, navigate, or find a project.
          </Dialog.Description>

          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <Search className="size-4 shrink-0 text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command or search projects..."
              aria-label="Command palette"
              className="h-12 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-soft focus:outline-none"
            />
          </div>

          <div className="max-h-[22rem] overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-ink-soft">No results</p>
            ) : (
              GROUP_ORDER.map((group) => {
                const groupItems = items.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                      {group}
                    </p>
                    <ul>
                      {groupItems.map((item) => {
                        const index = items.indexOf(item);
                        const active = index === activeIndex;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => run(item)}
                              onMouseMove={() => setActiveIndex(index)}
                              className={cn(
                                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors",
                                active
                                  ? "bg-cloud text-ink"
                                  : "text-ink-soft hover:bg-cloud hover:text-ink",
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "size-4 shrink-0",
                                  active ? "text-ink" : "text-ink-soft",
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
                              {item.hint ? (
                                <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                                  {item.hint}
                                </kbd>
                              ) : null}
                              {active ? (
                                <CornerDownLeft className="size-3.5 text-ink-soft" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-hairline px-1">↑</kbd>
              <kbd className="rounded border border-hairline px-1">↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-hairline px-1">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-hairline px-1">esc</kbd> close
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
