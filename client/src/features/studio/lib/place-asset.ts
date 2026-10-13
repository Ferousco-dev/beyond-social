import { endOf } from "../core/find.ts";
import { adoptVideo } from "../assist-actions";
import { addAsset, addItem } from "../core/ops.ts";
import { assetSchema, type Asset } from "../core/types.ts";
import { useStudio } from "../store/editor-store";
import { makeId } from "./format";
import { mediaRef } from "./media-ref";

export const ASSET_DRAG_TYPE = "application/x-studio-asset";
const IMAGE_SECONDS = 3;

export type Dragged = { readonly asset: Asset; readonly job?: string };

/** Reads a dragged file back from a drop, refusing anything that is not one. `job` is set for videos made in this app. */
export function readDraggedAsset(data: DataTransfer): Dragged | null {
  const raw = data.getData(ASSET_DRAG_TYPE);
  if (!raw) return null;
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = assetSchema.safeParse(json);
    if (!parsed.success) return null;
    const job = typeof json === "object" && json !== null && "job" in json && typeof json.job === "string" ? json.job : undefined;
    return job ? { asset: parsed.data, job } : { asset: parsed.data };
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

/**
 * Puts a finished video from the library on the timeline. It is first copied
 * into the user's own storage: the provider's link expires and cannot be read
 * by the editor when exporting.
 */
export async function placeJobVideo(jobId: string, name: string, duration: number | undefined, at?: number): Promise<void> {
  const store = useStudio.getState();
  store.setNotice("Preparing the video…");
  const copied = await adoptVideo(jobId);
  if (!copied.ok) return useStudio.getState().setNotice(copied.message);
  useStudio.getState().setNotice(null);
  const asset: Asset = { src: mediaRef(copied.mediaId), name: name.slice(0, 120) || "Video", kind: "video", ...(duration ? { duration } : {}) };
  useStudio.getState().edit((p) => addAsset(p, asset));
  placeAsset(asset, at);
}
