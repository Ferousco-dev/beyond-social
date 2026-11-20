import { endOf } from "../core/find.ts";
import { addItem } from "../core/ops.ts";
import { assetSchema, type Asset } from "../core/types.ts";
import { useStudio } from "../store/editor-store";
import { makeId } from "./format";

export const ASSET_DRAG_TYPE = "application/x-studio-asset";
const IMAGE_SECONDS = 3;

/** Reads a dragged file back from a drop, refusing anything that is not one. */
export function readDraggedAsset(data: DataTransfer): Asset | null {
  const raw = data.getData(ASSET_DRAG_TYPE);
  if (!raw) return null;
  try {
    const parsed = assetSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Puts a file on the timeline. Without a time, a video joins the end of the
 * video track and everything else goes at the playhead; with one (a drop), it
 * lands exactly there.
 */
export function placeAsset(asset: Asset, at?: number): void {
  const store = useStudio.getState();
  const project = store.history.present;
  const id = makeId();
  const seconds = asset.duration ?? IMAGE_SECONDS;
  const trackKind = asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "overlay";
  const track = project.tracks.find((t) => t.kind === trackKind);
  const start = Math.max(
    0,
    at ?? (asset.kind === "video" ? (track?.items.reduce((latest, i) => Math.max(latest, endOf(i)), 0) ?? 0) : store.currentTime),
  );
  const error = store.edit((p) =>
    addItem(
      p,
      track?.id ?? trackKind,
      asset.kind === "image"
        ? { kind: "image", id, start, duration: IMAGE_SECONDS, src: asset.src, x: 0.5, y: 0.5, scale: 0.5 }
        : { kind: asset.kind, id, start, duration: seconds, src: asset.src, trimIn: 0, sourceDuration: seconds, volume: 1 },
    ),
  );
  if (!error) store.select(id);
}
