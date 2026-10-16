import { endOf } from "../core/find.ts";
import { addAsset, addItem } from "../core/ops.ts";
import { useStudio } from "../store/editor-store";
import { makeId } from "./format";
import { mediaRef } from "./media-ref";

export interface Placed {
  /** Set when the clip could not be added. */
  readonly error: string | null;
}

/** Adds a finished, already adopted video after the last clip on the video track and selects it. */
export function placeGeneratedVideo(mediaId: string, seconds: number, name: string): Placed {
  const store = useStudio.getState();
  const src = mediaRef(mediaId);
  const clipId = makeId();
  const track = store.history.present.tracks.find((t) => t.kind === "video");
  const existing = track?.items.find((item) => item.kind === "video" && item.src === src);
  if (existing?.kind === "video") {
    store.select(existing.id);
    return { error: null };
  }
  const start = track?.items.reduce((latest, i) => Math.max(latest, endOf(i)), 0) ?? 0;
  const error = store.edit((p) => {
    const withAsset = addAsset(p, { src, name, kind: "video", duration: seconds });
    return withAsset.ok
      ? addItem(withAsset.value, track?.id ?? "video", { kind: "video", id: clipId, start, duration: seconds, src, trimIn: 0, sourceDuration: seconds, volume: 1 })
      : withAsset;
  });
  if (error) return { error };
  store.select(clipId);
  return { error: null };
}
