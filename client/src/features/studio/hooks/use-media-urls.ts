"use client";

import { useEffect } from "react";

import { resolveMediaUrls } from "../media-actions";
import { mediaId } from "../lib/media-ref";
import { soundId, soundUrl } from "../lib/sounds";
import { heldVideoUrl, localVideoUrl, pruneVideoCache } from "../lib/video-cache";
import { useStudio } from "../store/editor-store";

/** How often links are checked, and how close to expiring one must be to be renewed. */
const CHECK_MS = 60 * 1000;
const RENEW_WITHIN_MS = 3 * 60 * 1000;

/** When each file's link stops working. Only links near this are renewed. */
const expiries = new Map<string, number>();

/** Takes links that arrived with the page (or a batch) into the store. Held videos keep their local copy. */
export function rememberLinks(links: Readonly<Record<string, { url: string; expiresAt: number }>>): void {
  const urls: Record<string, string> = {};
  for (const [id, link] of Object.entries(links)) {
    expiries.set(id, link.expiresAt);
    urls[id] = heldVideoUrl(id) ?? link.url;
  }
  if (Object.keys(urls).length > 0) useStudio.getState().setMediaUrls(urls);
}

const needsLink = (id: string): boolean => {
  const expires = expiries.get(id);
  return expires === undefined || expires - Date.now() < RENEW_WITHIN_MS;
};

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

/** The ids of uploaded videos the project plays: the files worth keeping on the device. */
function videoIds(): Set<string> {
  const ids = new Set<string>();
  for (const track of useStudio.getState().history.present.tracks) {
    for (const item of track.items) if (item.kind === "video") ids.add(mediaId(item.src) ?? "");
  }
  ids.delete("");
  return ids;
}

/** Keeps a playable link for every uploaded file the project uses, asking only for the ones that need it. */
export function useMediaUrls(): void {
  useEffect(() => {
    let cancelled = false;

    /** Keeps each video the project plays on the device, so it plays and seeks locally. */
    const hold = (urls: Readonly<Record<string, string>>): void => {
      const videos = videoIds();
      for (const [id, signed] of Object.entries(urls)) {
        if (!videos.has(id) || heldVideoUrl(id)) continue;
        void localVideoUrl(id, signed).then((local) => {
          if (local && !cancelled) useStudio.getState().setMediaUrls({ [id]: local });
        });
      }
    };

    const fetchIds = async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      const links = await resolveMediaUrls(ids);
      if (cancelled) return;
      rememberLinks(links);
      hold(Object.fromEntries(Object.entries(links).map(([id, link]) => [id, link.url])));
    };

    const renew = (): void => void fetchIds(referencedIds().filter(needsLink));

    void pruneVideoCache();
    // Links that came with the page need no request, but their videos still go to the device.
    const known = useStudio.getState().mediaUrls;
    hold(Object.fromEntries(referencedIds().filter((id) => known[id] !== undefined).map((id) => [id, known[id] as string])));
    renew();
    ensureSounds();
    const timer = setInterval(renew, CHECK_MS);
    // A newly added file needs its link now, not at the next check.
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
