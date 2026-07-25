"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MessagesSquare, Search, X } from "lucide-react";
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

export function SearchDialog({
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

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return projects;
    return projects.filter((project) => project.title.toLowerCase().includes(value));
  }, [query, projects]);

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

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function openProject(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/c/${id}` as Route);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const project = results[activeIndex];
      if (project) openProject(project.id);
    }
  }

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[12%] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-hairline bg-paper text-ink shadow-card focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Search projects</Dialog.Title>
          <Dialog.Description className="sr-only">
            Find and open one of your projects.
          </Dialog.Description>

          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <Search className="size-4 shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search projects..."
              aria-label="Search projects"
              className="h-12 w-full bg-transparent text-base text-ink placeholder:text-ink-soft focus:outline-none"
            />
            <Dialog.Close
              aria-label="Close search"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-ink-soft">
              {query ? "Results" : "Recent projects"}
            </p>
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-soft">No projects found</p>
            ) : (
              <ul>
                {results.map((project, index) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => openProject(project.id)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-ink",
                        index === activeIndex ? "bg-cloud" : "hover:bg-cloud",
                      )}
                    >
                      <MessagesSquare className="size-4 shrink-0 text-ink-soft" />
                      <span className="truncate">{project.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
