"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { EmptyArt, EmptyScreen } from "@/components/ui/empty-art";

import { deferWithUndo } from "@/components/ui/undo-toast";

import { deleteProject, renameProject } from "../project-actions";

export interface ProjectCardItem {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function ProjectCard({ project }: { project: ProjectCardItem }): ReactNode {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState(project.title);
  const [shownTitle, setShownTitle] = useState(project.title);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptionId = useId();
  const updated = formatDate(project.updatedAt);

  async function submitRename(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    const previous = shownTitle;
    setError(null);
    setShownTitle(next);
    setRenameOpen(false);
    const result = await renameProject(project.id, next);
    if (!result.ok) {
      setShownTitle(previous);
      setError(result.message);
      setRenameOpen(true);
      return;
    }
    router.refresh();
  }

  function remove(): void {
    setRemoved(true);
    deferWithUndo({
      message: `“${shownTitle}” deleted`,
      onUndo: () => setRemoved(false),
      commit: async () => {
        const result = await deleteProject(project.id);
        if (!result.ok) return `“${shownTitle}” could not be deleted, so it was put back. ${result.message}`;
        router.refresh();
        return null;
      },
    });
  }

  if (removed) return null;

  return (
    <li className="group relative overflow-hidden rounded-xl border border-hairline bg-paper transition-colors hover:border-primary/50">
      <Link
        href={`/editor/${project.id}` as Route}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex aspect-video w-full items-center justify-center bg-cloud/60 px-10 transition-colors group-hover:bg-cloud">
          <EmptyArt name="video" className="max-w-[140px] transition-transform duration-300 group-hover:scale-[1.04]" />
        </div>
        <div className="px-3.5 py-3 pr-10">
          <p className="truncate text-sm font-medium text-ink">{shownTitle}</p>
          {updated ? <p className="mt-0.5 text-xs text-ink-soft">Updated {updated}</p> : null}
        </div>
      </Link>

      <div className="absolute bottom-2.5 right-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${shownTitle}`}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-36 rounded-lg border border-hairline bg-paper p-1 text-ink shadow-card">
              <DropdownMenu.Item
                onSelect={() => {
                  setDraft(shownTitle);
                  setError(null);
                  setRenameOpen(true);
                }}
                className="cursor-pointer rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-cloud"
              >
                Rename
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => remove()}
                className="cursor-pointer rounded-md px-2.5 py-2 text-sm text-destructive outline-none data-[highlighted]:bg-cloud"
              >
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <Dialog.Root open={renameOpen} onOpenChange={setRenameOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            aria-describedby={`${descriptionId}-rename`}
            className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-paper p-5 shadow-card"
          >
            <Dialog.Title className="text-base font-semibold text-ink">Rename project</Dialog.Title>
            <Dialog.Description id={`${descriptionId}-rename`} className="mt-1 text-sm text-ink-soft">
              Choose a name that is easy to find later.
            </Dialog.Description>
            <form onSubmit={(event) => void submitRename(event)} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-ink">
                Project name
                <input
                  autoFocus
                  value={draft}
                  maxLength={120}
                  onChange={(event) => setDraft(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
                />
              </label>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button type="button" className="min-h-10 cursor-pointer rounded-md px-3 text-sm text-ink hover:bg-cloud">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={draft.trim() === ""}
                  className="btn btn-primary btn-md"
                >
                  Save name
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </li>
  );
}

export function ProjectsGrid({ projects }: { projects: readonly ProjectCardItem[] }): ReactNode {
  if (projects.length === 0) {
    return (
      <EmptyScreen
        art="projects"
        title="No projects yet"
        body="Every video you make is saved here, ready to edit."
        action={
          <Link href="/dashboard/new" className="btn btn-primary btn-md">
            <Plus aria-hidden />
            New video
          </Link>
        }
      />
    );
  }

  return (
    <ul aria-label="Projects" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </ul>
  );
}
