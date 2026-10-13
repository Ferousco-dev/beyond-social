import { TRACK_ACCEPTS, type Item, type Project, type Result, type Track } from "./types.ts";

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Result<never> => ({ ok: false, error });

export const endOf = (item: Item): number => item.start + item.duration;

/** How fast an item plays. Items that never set it play at normal speed. */
export const speedOf = (item: Item): number => ("speed" in item ? (item.speed ?? 1) : 1);

/** Two items collide when they share any stretch of time, not merely an edge. */
export const overlaps = (a: Item, b: Item): boolean => a.start < endOf(b) - 1e-9 && b.start < endOf(a) - 1e-9;

export function locate(project: Project, itemId: string): { track: Track; item: Item } | null {
  for (const track of project.tracks) {
    const item = track.items.find((candidate) => candidate.id === itemId);
    if (item) return { track, item };
  }
  return null;
}

/** Finish time of the whole project: the end of its last item. */
export function projectDuration(project: Project): number {
  return project.tracks.reduce((latest, track) => track.items.reduce((m, item) => Math.max(m, endOf(item)), latest), 0);
}

export function acceptsItem(track: Track, item: Item): boolean {
  return TRACK_ACCEPTS[track.kind] === item.kind;
}

/** The track after `item` replaced whatever had its id, or an error if that makes two items collide. */
export function withItem(track: Track, item: Item): Result<Track> {
  const others = track.items.filter((candidate) => candidate.id !== item.id);
  if (others.some((other) => overlaps(other, item))) return fail("That would overlap another clip on the same track.");
  const items = [...others, item].sort((a, b) => a.start - b.start);
  return ok({ ...track, items });
}

export function replaceTrack(project: Project, track: Track): Project {
  return { ...project, tracks: project.tracks.map((existing) => (existing.id === track.id ? track : existing)) };
}
