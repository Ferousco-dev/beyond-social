"use client";

import { useEffect } from "react";

import { resolveMediaUrls } from "../media-actions";
import { mediaId } from "../lib/media-ref";
import { soundId, soundUrl } from "../lib/sounds";
import { useStudio } from "../store/editor-store";

/** Links last ten minutes, so they are renewed well before that. */
const REFRESH_MS = 8 * 60 * 1000;

/** Makes every built-in sound the project uses, so it can play and export. */
function ensureSounds(): void {
  const { history, mediaUrls, setMediaUrls } = useStudio.getState();
  for (const track of history.present.tracks) {
    for (const item of track.items) {
      const id = "src" in item ? soundId(item.src) : null;
      if (id === null || mediaUrls[`lib:${id}`] !== undefined) continue;
      void soundUrl(id).then((url) => setMediaUrls({ [`lib:${id}`]: url })).catch(() => undefined);
    }
  }
}

function referencedIds(): string[] {
  const { history } = useStudio.getState();
  const ids = new Set<string>();
  for (const track of history.present.tracks) {
    for (const item of track.items) if ("src" in item) ids.add(mediaId(item.src) ?? "");
  }
  for (const asset of history.present.assets ?? []) ids.add(mediaId(asset.src) ?? "");
  ids.delete("");
  return [...ids];
}

/** Keeps a playable link for every uploaded file the project uses. */
export function useMediaUrls(): void {
  useEffect(() => {
    let cancelled = false;
    const fetchIds = async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      const urls = await resolveMediaUrls(ids);
      if (!cancelled) useStudio.getState().setMediaUrls(urls);
    };
    void fetchIds(referencedIds());
    ensureSounds();
    const timer = setInterval(() => void fetchIds(referencedIds()), REFRESH_MS);
    // A newly added file needs its link now, not at the next refresh.
    const unsubscribe = useStudio.subscribe((s, p) => {
      if (s.history.present === p.history.present) return;
      ensureSounds();
      const missing = referencedIds().filter((id) => s.mediaUrls[id] === undefined);
      if (missing.length > 0) void fetchIds(missing);
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
}
