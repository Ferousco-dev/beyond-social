"use client";

import { useCallback, useState } from "react";

import { locate, speedOf } from "../core/find.ts";
import { deleteItem, splitAll, splitItem } from "../core/ops.ts";
import { type Item, type Project, type Result } from "../core/types.ts";
import { makeId } from "../lib/format";
import { resolveSrc } from "../lib/media-ref";
import { detectSceneCuts } from "../lib/scene-detect";
import { useStudio } from "../store/editor-store";

type VideoClip = Extract<Item, { kind: "video" }>;

function targetVideo(project: Project, selection: string | null): VideoClip | null {
  const chosen = selection ? locate(project, selection)?.item : undefined;
  if (chosen?.kind === "video") return chosen;
  const first = project.tracks.find((t) => t.kind === "video")?.items[0];
  return first?.kind === "video" ? first : null;
}

/** Edits that act on the selection and the playhead. Shared by the toolbar and the shortcuts. */
export function useTimelineActions(): {
  split: () => void;
  remove: (ripple: boolean) => void;
  splitScenes: () => Promise<void>;
  detectingScenes: boolean;
} {
  const [detectingScenes, setDetectingScenes] = useState(false);

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

  const splitScenes = useCallback(async (): Promise<void> => {
    const { history, selection, mediaUrls, setNotice } = useStudio.getState();
    const clip = targetVideo(history.present, selection);
    if (!clip) {
      setNotice("Add a video clip first.");
      return;
    }
    const url = resolveSrc(clip.src, mediaUrls);
    if (!url) {
      setNotice("That video is still loading. Try again in a moment.");
      return;
    }
    setDetectingScenes(true);
    setNotice("Scanning clip for scenes…");
    try {
      const speed = speedOf(clip);
      const sourceCuts = await detectSceneCuts(url, clip.trimIn, clip.trimIn + clip.duration * speed);
      if (sourceCuts.length === 0) {
        setNotice("No scene cuts found in this clip. Use Split (B) to cut manually.");
        return;
      }
      const timelineCuts = sourceCuts.map((sourceAt) => clip.start + (sourceAt - clip.trimIn) / speed);
      const failure = useStudio.getState().edit((project) => {
        let current: Result<Project> = { ok: true, value: project };
        let currentId = clip.id;
        for (const cutAt of timelineCuts) {
          if (!current.ok) break;
          const nextId = makeId();
          const splitResult = splitItem(current.value, currentId, cutAt, nextId);
          if (!splitResult.ok) continue;
          current = splitResult;
          currentId = nextId;
        }
        return current;
      });
      if (failure) {
        setNotice(failure);
      } else {
        useStudio.getState().select(clip.id);
        setNotice(`Separated into ${timelineCuts.length + 1} scenes.`);
      }
    } catch {
      setNotice("Could not scan this video for scenes. Use Split (B) to cut manually.");
    } finally {
      setDetectingScenes(false);
    }
  }, []);

  return { split, remove, splitScenes, detectingScenes };
}
