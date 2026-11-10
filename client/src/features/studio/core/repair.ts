import { z } from "zod";

import { acceptsItem, endOf } from "./find.ts";
import { assetSchema, itemSchema, projectGenerationSchema, type Asset, type Item, type Project, type Track } from "./types.ts";
import { emptyProject, parseProject } from "./validate.ts";

export interface Repaired {
  readonly project: Project;
  /** Plain-language notes on what had to change, so nothing is altered without saying so. */
  readonly problems: readonly string[];
}

const TRACK_KINDS = ["text", "video", "audio", "overlay", "caption"] as const;
const MAX_TRACKS = 24;
const MAX_ITEMS = 500;
const MAX_ASSETS = 100;

const record = z.record(z.unknown());
const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Rescues a stored project that fails the strict check, instead of refusing to
 * open it. It keeps everything that is valid and fixes what can be fixed
 * without losing content: an item that overlaps another is moved to just after
 * it, a missing track is added. Only what cannot be read at all is left out.
 * Returns null if nothing usable can be made from the input.
 */
export function repairProject(input: unknown): Repaired | null {
  const root = record.safeParse(input);
  if (!root.success) return null;
  const base = emptyProject();
  const data = root.data;
  const problems: string[] = [];

  const whole = (value: unknown, low: number, high: number, fallback: number): number =>
    typeof value === "number" && Number.isInteger(value) && value >= low && value <= high ? value : fallback;
  const width = whole(data.width, 16, 4096, base.width);
  const height = whole(data.height, 16, 4096, base.height);
  const fps = typeof data.fps === "number" && data.fps >= 1 && data.fps <= 120 ? data.fps : base.fps;
  if (width !== data.width || height !== data.height || fps !== data.fps) problems.push("The video size or frame rate was missing or invalid, so the standard one is used.");

  const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
  if (!Array.isArray(data.tracks)) problems.push("The timeline could not be read, so it starts empty.");

  const seenItems = new Set<string>();
  const seenTracks = new Set<string>();
  const tracks: Track[] = [];
  let dropped = 0;
  let moved = 0;
  let wrongTrack = 0;
  let duplicates = 0;

  for (const raw of rawTracks.slice(0, MAX_TRACKS)) {
    const track = record.safeParse(raw);
    if (!track.success) continue;
    const kind = TRACK_KINDS.find((candidate) => candidate === track.data.kind);
    if (!kind) continue;
    let id = typeof track.data.id === "string" && track.data.id.length > 0 && track.data.id.length <= 64 ? track.data.id : kind;
    for (let n = 2; seenTracks.has(id); n += 1) id = `${kind}-${n}`;
    seenTracks.add(id);
    const shell: Track = { id, kind, items: [] };

    const accepted: Item[] = [];
    for (const candidate of (Array.isArray(track.data.items) ? track.data.items : []).slice(0, MAX_ITEMS)) {
      const item = itemSchema.safeParse(candidate);
      if (!item.success) {
        dropped += 1;
        continue;
      }
      if (!acceptsItem(shell, item.data)) {
        wrongTrack += 1;
        continue;
      }
      if (seenItems.has(item.data.id)) {
        duplicates += 1;
        continue;
      }
      seenItems.add(item.data.id);
      accepted.push(item.data);
    }

    // Overlaps are not allowed on a track. Keep every item and slide the later one to follow the earlier.
    let cursor = 0;
    const items = accepted
      .sort((a, b) => a.start - b.start)
      .map((item) => {
        if (item.start >= cursor - 1e-9) {
          cursor = endOf(item);
          return item;
        }
        moved += 1;
        const slid: Item = { ...item, start: cursor };
        cursor = endOf(slid);
        return slid;
      });
    tracks.push({ ...shell, items });
  }

  if (dropped > 0) problems.push(`${count(dropped, "item")} could not be read and ${dropped === 1 ? "was" : "were"} left out.`);
  if (wrongTrack > 0) problems.push(`${count(wrongTrack, "item")} sat on the wrong kind of track and ${wrongTrack === 1 ? "was" : "were"} left out.`);
  if (duplicates > 0) problems.push(`${count(duplicates, "item")} repeated another item's id and ${duplicates === 1 ? "was" : "were"} left out.`);
  if (moved > 0) problems.push(`${count(moved, "item")} overlapped another on the same track and ${moved === 1 ? "was" : "were"} moved to follow it.`);

  // Every kind of track the editor works with must exist, so the tools always have somewhere to put things.
  for (const standard of base.tracks) {
    if (tracks.some((track) => track.kind === standard.kind)) continue;
    let id = standard.id;
    for (let n = 2; seenTracks.has(id); n += 1) id = `${standard.kind}-${n}`;
    seenTracks.add(id);
    const added = { ...standard, id };
    if (standard.kind === "text") tracks.unshift(added);
    else tracks.push(added);
  }

  const assets: Asset[] = [];
  if (Array.isArray(data.assets)) {
    for (const candidate of data.assets) {
      const asset = assetSchema.safeParse(candidate);
      if (asset.success && assets.length < MAX_ASSETS) assets.push(asset.data);
    }
    if (assets.length < data.assets.length) problems.push("Some files in the project's file list could not be read and were left out.");
  }

  const generation = data.generation === undefined ? undefined : projectGenerationSchema.safeParse(data.generation);
  if (generation && !generation.success) problems.push("The note about how this video was generated could not be read and was dropped.");

  const project: Project = {
    version: 1,
    width,
    height,
    fps,
    tracks,
    assets,
    ...(generation?.success ? { generation: generation.data } : {}),
  };
  // Whatever comes out must pass the strict check, or it is not offered.
  return parseProject(project).ok ? { project, problems } : null;
}
