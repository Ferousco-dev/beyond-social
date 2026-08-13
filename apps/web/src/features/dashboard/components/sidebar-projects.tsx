"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Pencil, Pin, Trash2 } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { type SidebarProject } from "@/lib/dashboard/data";

import { useProjectMutations } from "../hooks/use-project-mutations";
import { cn } from "@/lib/utils";

type Item = SidebarProject;

const GROUP_ORDER = ["Today", "Previous 7 days", "Older"];

const MENU_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud";

export function SidebarProjects({
  initialItems,
  onNavigate,
}: {
  initialItems: readonly SidebarProject[];
  onNavigate?: () => void;
}) {
  const { items, error, setError, rename, togglePinned, remove } =
    useProjectMutations(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  function commitRename() {
    const id = editingId;
    setEditingId(null);
    if (id) rename(id, draft.trim());
  }

  async function handleDelete(item: Item) {
    setError(null);
    const confirmed = await confirm({
      title: `Delete "${item.title}"?`,
      description:
        "The project goes, and its videos and messages go with it. This cannot be undone.",
      confirmLabel: "Delete project",
      tone: "destructive",
    });
    if (!confirmed) return;
    setOpenMenuId(null);
    await remove(item);
  }

  useEffect(() => {
    if (!editingId) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [editingId]);

  function renderRow(item: Item) {
    if (editingId === item.id) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setEditingId(null);
          }}
          aria-label="Rename project"
          className="w-full rounded-[10px] border border-primary bg-paper px-3 py-2 text-sm text-ink focus:outline-none"
        />
      );
    }

    return (
      <div className="group/item relative">
        <Link
          href={`/dashboard/c/${item.id}` as Route}
          onClick={onNavigate}
          className="block truncate rounded-[10px] px-3 py-2 pr-9 text-sm text-ink transition-colors hover:bg-cloud"
        >
          {item.title}
        </Link>
        <DropdownMenu.Root
          open={openMenuId === item.id}
          onOpenChange={(next) => setOpenMenuId(next ? item.id : null)}
        >
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Project options"
              className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-soft opacity-0 transition-opacity hover:bg-hairline hover:text-ink group-hover/item:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              className="z-50 w-40 rounded-xl border border-hairline bg-paper p-1 text-ink shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <DropdownMenu.Item
                className={MENU_ITEM}
                onSelect={() => {
                  setOpenMenuId(null);
                  togglePinned(item);
                }}
              >
                <Pin className="size-4 text-ink-soft" />
                {item.pinned ? "Unpin" : "Pin"}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={MENU_ITEM}
                onSelect={() => {
                  setEditingId(item.id);
                  setDraft(item.title);
                }}
              >
                <Pencil className="size-4 text-ink-soft" />
                Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={cn(MENU_ITEM, "text-destructive data-[highlighted]:bg-destructive/10")}
                // The menu is held open behind the dialog so that cancelling
                // returns focus to this row rather than to nothing.
                onSelect={(event) => {
                  event.preventDefault();
                  void handleDelete(item);
                }}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    );
  }

  const pinned = items.filter((item) => item.pinned);

  return (
    <div>
      {dialog}
      {/* A rollback on its own looks like the app ignoring the click, so the
          reason is stated where the change appeared to happen. */}
      {error ? (
        <p role="alert" className="px-3 pb-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {pinned.length > 0 ? (
        <div className="mb-5">
          <p className="px-3 pb-1 text-xs font-medium text-ink-soft">Pinned</p>
          <ul className="flex flex-col gap-0.5">
            {pinned.map((item) => (
              <li key={item.id}>{renderRow(item)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((item) => !item.pinned && item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="mb-5">
            <p className="px-3 pb-1 text-xs font-medium text-ink-soft">{group}</p>
            <ul className="flex flex-col gap-0.5">
              {groupItems.map((item) => (
                <li key={item.id}>{renderRow(item)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
