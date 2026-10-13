"use client";

import { useCallback } from "react";

import { endOf, locate } from "../core/find.ts";
import { deleteItem, splitItem } from "../core/ops.ts";
import { makeId } from "../lib/format";
import { useStudio } from "../store/editor-store";

/** Edits that act on the selection and the playhead. Shared by the toolbar and the shortcuts. */
export function useTimelineActions(): { split: () => void; remove: (ripple: boolean) => void } {
  const split = useCallback((): void => {
    const { history, selection, currentTime, edit, select } = useStudio.getState();
    const project = history.present;
    // With nothing selected, cut whatever sits under the playhead.
    const target =
      selection ??
      project.tracks.flatMap((t) => t.items).find((i) => i.kind !== "caption" && currentTime > i.start && currentTime < endOf(i))?.id;
    if (!target || !locate(project, target)) {
      useStudio.getState().setNotice("Move the playhead over a clip to cut it.");
      return;
    }
    const newId = makeId();
    const error = edit((p) => splitItem(p, target, currentTime, newId));
    if (!error) select(newId);
  }, []);

  const remove = useCallback((ripple: boolean): void => {
    const { selection, edit, select } = useStudio.getState();
    if (!selection) return;
    if (!edit((p) => deleteItem(p, selection, ripple))) select(null);
  }, []);

  return { split, remove };
}
