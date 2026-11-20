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

/** Lays the voiceover on the audio track from the start, once. A second call for the same recording changes nothing. */
export function placeVoiceover(mediaId: string, seconds: number): Placed {
  const store = useStudio.getState();
  const src = mediaRef(mediaId);
  const track = store.history.present.tracks.find((t) => t.kind === "audio");
  if (track?.items.some((item) => item.kind === "audio" && item.src === src)) return { error: null };
  const length = Math.max(1, seconds);
  const error = store.edit((p) => {
    const withAsset = addAsset(p, { src, name: "Voiceover", kind: "audio", duration: length });
    return withAsset.ok
      ? addItem(withAsset.value, track?.id ?? "audio", { kind: "audio", id: makeId(), start: 0, duration: length, src, trimIn: 0, sourceDuration: length, volume: 1 })
      : withAsset;
  });
  return { error };
}
