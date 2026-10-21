"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clock, FileVideo, LoaderCircle, MessageCircle, MoreHorizontal } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { type SidebarProject } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { deleteProject, renameProject } from "../project-actions";

export function SidebarProjectRow({
  item,
  onNavigate,
}: {
  item: SidebarProject;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptionId = useId();
  const Icon = item.kind === "video" ? FileVideo : item.kind === "chat" ? MessageCircle : Clock;

  async function rename(event: FormEvent<HTMLFormElement>): Promise<void> {
    if (item.kind === "draft") return;
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await renameProject(item.kind, item.id, title);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setRenameOpen(false);
    router.refresh();
  }

  async function remove(): Promise<void> {
    if (item.kind === "draft") return;
    setBusy(true);
    setError(null);
    const result = await deleteProject(item.kind, item.id);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <li className="flex min-w-0 items-center gap-1">
      <Link
        href={item.href as Route}
        onClick={onNavigate}
        aria-current={pathname === item.href ? "page" : undefined}
        title={item.title}
        className={cn(
          "flex min-h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          pathname === item.href ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:bg-cloud hover:text-ink",
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{item.title}</span>
      </Link>
      {item.kind !== "draft" ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" aria-label={`Actions for ${item.title}`} className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:size-11">
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-36 rounded-lg border border-hairline bg-paper p-1 text-ink shadow-card">
              <DropdownMenu.Item onSelect={() => { setTitle(item.title); setError(null); setRenameOpen(true); }} className="cursor-pointer rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud">Rename</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => { setError(null); setDeleteOpen(true); }} className="cursor-pointer rounded-md px-2.5 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-cloud">Delete</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}

      <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content aria-describedby={`${descriptionId}-rename`} className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-paper p-5 shadow-card">
            <Dialog.Title className="text-base font-semibold text-ink">Rename project</Dialog.Title>
            <Dialog.Description id={`${descriptionId}-rename`} className="mt-1 text-sm text-ink-soft">Choose a name that is easy to find later.</Dialog.Description>
            <form onSubmit={(event) => void rename(event)} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-ink">
                Project name
                <input autoFocus value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary" />
              </label>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild><button type="button" className="min-h-10 rounded-md px-3 text-sm text-ink hover:bg-cloud">Cancel</button></Dialog.Close>
                <button type="submit" disabled={busy || title.trim() === ""} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} Save name
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content aria-describedby={`${descriptionId}-delete`} className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-paper p-5 shadow-card">
            <Dialog.Title className="text-base font-semibold text-ink">Delete “{item.title}”?</Dialog.Title>
            <Dialog.Description id={`${descriptionId}-delete`} className="mt-1 text-sm text-ink-soft">{item.kind === "chat" ? "This conversation will be removed from your work list." : "This project and its timeline will be deleted."}</Dialog.Description>
            {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild><button type="button" className="min-h-10 rounded-md px-3 text-sm text-ink hover:bg-cloud">Cancel</button></Dialog.Close>
              <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </li>
  );
}