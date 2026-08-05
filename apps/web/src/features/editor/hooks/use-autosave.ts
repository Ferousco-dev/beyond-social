"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveEditorDocument } from "../actions";
import { type Project } from "@/lib/editor/types";

/**
 * Saves the timeline after edits settle.
 *
 * Debounced rather than saved per keystroke: dragging a clip fires a change on
 * every frame, and a request per frame would be both slow and pointless when
 * only the final position matters.
 */

/** Long enough to coalesce a drag, short enough that a quick tab-away is safe. */
const DEBOUNCE_MS = 1_200;

export type SaveState = "idle" | "saving" | "saved" | "conflict" | "error";

export function useAutosave({
  projectId,
  project,
  initialRevision,
  enabled,
}: {
  projectId: string;
  project: Project;
  initialRevision: number;
  enabled: boolean;
}): { state: SaveState; saveNow: () => void } {
  const [state, setState] = useState<SaveState>("idle");
  const revision = useRef(initialRevision);
  const timer = useRef<number | null>(null);
  const latest = useRef(project);
  latest.current = project;

  // The first render is the document we just loaded, so saving it would write
  // back what we read and burn a revision for nothing.
  const baseline = useRef(project);
  const inFlight = useRef(false);
  /*
   * An edit that arrives while a save is in flight used to be dropped: the
   * debounce fired, `save` returned early, and nothing rescheduled it. The
   * indicator then read "Saved" over work that had never been sent, which is
   * the worst version of this bug because it looks like success.
   */
  const dirtyWhileSaving = useRef(false);

  const save = useCallback(async () => {
    if (!enabled) return;
    if (inFlight.current) {
      dirtyWhileSaving.current = true;
      return;
    }
    inFlight.current = true;
    setState("saving");

    const snapshot = latest.current;
    const result = await saveEditorDocument({
      projectId,
      project: snapshot,
      revision: revision.current,
    });
    inFlight.current = false;

    if (result.status === "ok") {
      revision.current = result.revision;
      baseline.current = snapshot;
      setState("saved");
      // Anything edited while that request was open has not been written yet.
      if (dirtyWhileSaving.current) {
        dirtyWhileSaving.current = false;
        void save();
      }
      return;
    }
    dirtyWhileSaving.current = false;
    // A conflict is reported, not resolved silently. Overwriting another tab's
    // newer work without saying so is the one outcome a user cannot recover
    // from.
    setState(result.status === "conflict" ? "conflict" : "error");
  }, [enabled, projectId]);

  const saveNow = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    void save();
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    // Object identity is enough: every edit produces a new project object, and
    // an unchanged one is the same reference.
    if (project === baseline.current) return;

    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), DEBOUNCE_MS);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [project, enabled, save]);

  /*
   * A pending edit must not be lost to a closed tab, and `pagehide` covers only
   * that. Leaving the editor for another screen is a client-side navigation:
   * the page never unloads, the event never fires, and the component unmounts
   * with its debounce timer cleared. Anything edited in the last second and a
   * bit went with it, silently.
   *
   * The unmount flush is kept in its own effect with no dependencies so it runs
   * on unmount alone. Putting it in the debounce effect's cleanup would fire it
   * on every edit and defeat the debounce entirely. Neither can await, so both
   * are best-effort, which is why the debounce is short.
   */
  const flushRef = useRef(save);
  flushRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    const flush = (): void => {
      if (latest.current !== baseline.current && !inFlight.current) void flushRef.current();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled]);

  return { state, saveNow };
}
