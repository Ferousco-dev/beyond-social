import { speedOf } from "./find.ts";
import { MIN_DURATION, type Item, type Project } from "./types.ts";

/** Lengths this close are the same file; players round differently. */
const SLACK = 0.05;

/**
 * Makes the project agree with how long a file really is. A generated video
 * can come back shorter than the length that was asked for, and a clip that
 * claims more footage than the file has shows nothing once the file runs out,
 * which looks like the video cutting. Each clip of that file is shortened to
 * the footage there is, and later clips on its track close up the gap.
 * Returns the same project when nothing claimed too much.
 */
export function fitToFootage(project: Project, src: string, seconds: number): Project {
  if (!Number.isFinite(seconds) || seconds <= MIN_DURATION) return project;
  let changed = false;

  const assets = (project.assets ?? []).map((asset) => {
    if (asset.src !== src || asset.duration === undefined || asset.duration <= seconds + SLACK) return asset;
    changed = true;
    return { ...asset, duration: seconds };
  });

  const tracks = project.tracks.map((track) => {
    let pulled = 0;
    const fitted = new Map<string, Item>();
    for (const item of [...track.items].sort((a, b) => a.start - b.start)) {
      const moved = pulled > 0 ? { ...item, start: Math.max(0, item.start - pulled) } : item;
      if ((moved.kind !== "video" && moved.kind !== "audio") || moved.src !== src || moved.sourceDuration <= seconds + SLACK) {
        fitted.set(item.id, moved);
        continue;
      }
      changed = true;
      const trimIn = Math.min(moved.trimIn, Math.max(0, seconds - MIN_DURATION));
      const duration = Math.max(MIN_DURATION, Math.min(moved.duration, (seconds - trimIn) / speedOf(moved)));
      pulled += moved.duration - duration;
      fitted.set(item.id, { ...moved, sourceDuration: seconds, trimIn, duration });
    }
    return { ...track, items: track.items.map((item) => fitted.get(item.id) ?? item) };
  });

  return changed ? { ...project, assets, tracks } : project;
}
