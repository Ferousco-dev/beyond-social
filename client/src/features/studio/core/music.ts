import { endOf, ok } from "./find.ts";
import { type Item, type Project, type Result } from "./types.ts";

/** Background music lives on its own track, so it never collides with sounds placed by hand. */
export const MUSIC_TRACK_ID = "music";
/** Quiet enough to sit under speech. */
export const DEFAULT_MUSIC_VOLUME = 0.25;

export interface Music {
  readonly src: string;
  /** The length of one play of the track, in seconds. */
  readonly seconds: number;
  readonly volume: number;
}

/** How long the video runs, not counting the music already under it. */
export function contentLength(project: Project): number {
  return project.tracks
    .filter((track) => track.id !== MUSIC_TRACK_ID)
    .reduce((latest, track) => track.items.reduce((m, item) => Math.max(m, endOf(item)), latest), 0);
}

/** The music under the video now, if any. */
export function currentMusic(project: Project): Music | null {
  const first = project.tracks.find((track) => track.id === MUSIC_TRACK_ID)?.items[0];
  return first?.kind === "audio" ? { src: first.src, seconds: first.sourceDuration, volume: first.volume } : null;
}

/**
 * Lays a track under the whole video: repeated back to back until the video
 * ends, the last play cut to finish with it. Passing null takes the music out.
 */
export function setBackgroundMusic(project: Project, music: Music | null, newId: () => string): Result<Project> {
  const others = project.tracks.filter((track) => track.id !== MUSIC_TRACK_ID);
  const length = contentLength(project);
  if (!music || length <= 0 || music.seconds <= 0) return ok({ ...project, tracks: others });
  const items: Item[] = [];
  for (let start = 0; start < length - 1e-6; start += music.seconds) {
    items.push({
      kind: "audio",
      id: newId(),
      start,
      duration: Math.min(music.seconds, length - start),
      src: music.src,
      trimIn: 0,
      sourceDuration: music.seconds,
      volume: music.volume,
    });
  }
  return ok({ ...project, tracks: [...others, { id: MUSIC_TRACK_ID, kind: "audio", items }] });
}
