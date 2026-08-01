"use client";

import { type Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  deleteProject,
  renameProject,
  setProjectPinned,
} from "@/features/dashboard/project-actions";
import { type SidebarProject } from "@/lib/dashboard/data";

/**
 * Renaming, pinning and deleting a project from the sidebar.
 *
 * Each change is applied immediately and put back if the server refuses. The
 * sidebar is navigation, so waiting on a round trip would make the whole app
 * feel slow, and keeping a change the database rejected would be worse, which
 * is what the rollback is for.
 *
 * Separated from the component because the component was doing both this and
 * the markup for every row, and had grown past the point where either was easy
 * to read.
 */
export function useProjectMutations(initialItems: readonly SidebarProject[]) {
  const [items, setItems] = useState<SidebarProject[]>(() => [...initialItems]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  /*
   * The seed above runs once, so the list was frozen at whatever the sidebar
   * was first rendered with: starting a new chat wrote the project and
   * revalidated the layout, and the new row still did not appear until a full
   * reload. Adopting each new server render is what makes it show up, and it
   * settles optimistic renames and deletes onto their persisted values too.
   *
   * `initialItems` is a fresh array only when the layout actually re-renders
   * from the server, so this does not fight the optimistic updates below.
   */
  useEffect(() => {
    setItems([...initialItems]);
  }, [initialItems]);

  /*
   * The lookup happens outside the updater on purpose. A state updater has to
   * be pure: strict mode invokes it twice, so calling the server action from
   * inside one would send every rename and delete to the server twice.
   */
  const rename = useCallback(
    (id: string, next: string) => {
      setError(null);
      const previous = items.find((item) => item.id === id);
      if (!previous || next === "" || next === previous.title) return;

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, title: next } : item)));

      void renameProject({ projectId: id, title: next }).then((result) => {
        if (result.status === "ok") return;
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, title: previous.title } : item)),
        );
        setError(result.message);
      });
    },
    [items],
  );

  const togglePinned = useCallback((item: SidebarProject) => {
    setError(null);
    const pinned = !item.pinned;
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, pinned } : entry)));

    void setProjectPinned({ projectId: item.id, pinned }).then((result) => {
      if (result.status === "ok") return;
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, pinned: item.pinned } : entry)),
      );
      setError(result.message);
    });
  }, []);

  const remove = useCallback(
    async (item: SidebarProject) => {
      setError(null);
      // Read before the update, not inside it, for the same purity reason as
      // rename. Kept so a failure puts the row back where it was rather than at
      // the end of the list.
      const index = items.findIndex((entry) => entry.id === item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));

      const result = await deleteProject({ projectId: item.id });
      if (result.status === "ok") {
        // The open conversation may be the one just deleted, and its page would
        // now be a dead route.
        if (pathname.includes(item.id)) router.push("/dashboard" as Route);
        return;
      }

      setItems((prev) => {
        const restored = [...prev];
        restored.splice(index < 0 ? restored.length : index, 0, item);
        return restored;
      });
      setError(result.message);
    },
    [items, pathname, router],
  );

  return { items, error, setError, rename, togglePinned, remove };
}
