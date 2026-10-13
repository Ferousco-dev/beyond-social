"use client";

import { useCallback } from "react";

import { deleteItem, splitAll, splitItem } from "../core/ops.ts";
import { makeId } from "../lib/format";
import { useStudio } from "../store/editor-store";

/** Edits that act on the selection and the playhead. Shared by the toolbar and the shortcuts. */
export function useTimelineActions(): { split: () => void; remove: (ripple: boolean) => void } {
  const split = useCallback((): void => {
    const { selection, currentTime, edit, select } = useStudio.getState();
    // A selected item is cut on its own; with nothing selected, everything under the playhead is.
    const newId = makeId();
    const error = selection ? edit((p) => splitItem(p, selection, currentTime, newId)) : edit((p) => splitAll(p, currentTime, makeId));
    if (!error && selection) select(newId);
  }, []);

  const remove = useCallback((ripple: boolean): void => {
    const { selection, edit, select } = useStudio.getState();
    if (!selection) return;
    if (!edit((p) => deleteItem(p, selection, ripple))) select(null);
  }, []);

  return { split, remove };
}
