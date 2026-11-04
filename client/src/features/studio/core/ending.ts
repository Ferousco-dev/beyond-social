import { ok } from "./find.ts";
import { contentLength, currentMusic, MUSIC_TRACK_ID, setBackgroundMusic } from "./music.ts";
import { type Item, type Project, type Result, type Track } from "./types.ts";

/** Ending items carry this prefix, so the card can be found, changed or removed later. */
const ENDING = "ending:";
export const ENDING_SECONDS = 3;

export interface Ending {
  /** The call to action, shown large. */
  readonly headline: string;
  /** A second, smaller line such as a handle or website; may be empty. */
  readonly detail: string;
}

const isEnding = (item: Item): boolean => item.id.startsWith(ENDING);

/** The ending card on the video now, if any. */
export function currentEnding(project: Project): Ending | null {
  const items = project.tracks.flatMap((track) => track.items).filter(isEnding);
  const headline = items.find((item) => item.kind === "text");
  if (headline?.kind !== "text") return null;
  const detail = items.find((item) => item.kind === "caption");
  return { headline: headline.text, detail: detail?.kind === "caption" ? detail.text : "" };
}

function withoutEnding(project: Project): Project {
  return { ...project, tracks: project.tracks.map((track) => ({ ...track, items: track.items.filter((item) => !isEnding(item)) })) };
}

function placeOn(tracks: Track[], kind: Track["kind"], item: Item): Track[] {
  const index = tracks.findIndex((track) => track.kind === kind && track.id !== MUSIC_TRACK_ID);
  if (index === -1) return [...tracks, { id: kind, kind, items: [item] }];
  return tracks.map((track, i) => (i === index ? { ...track, items: [...track.items, item] } : track));
}

/**
 * Puts a closing card after the last clip: the call to action large in the
 * middle, the detail smaller beneath it, on black. Setting it again replaces
 * the old card, and null takes it away. Background music is refitted so it
 * plays under the card too.
 */
export function setEnding(project: Project, ending: Ending | null, newId: () => string): Result<Project> {
  const base = withoutEnding(project);
  const headline = ending?.headline.trim() ?? "";
  let next = base;
  if (headline !== "" && ending) {
    const start = contentLength(base);
    if (start <= 0) return { ok: false, error: "Add a clip first, so the ending has something to follow." };
    let tracks = placeOn([...base.tracks], "text", {
      kind: "text",
      id: `${ENDING}${newId()}`,
      start,
      duration: ENDING_SECONDS,
      text: headline,
      style: { preset: "classic", color: "#ffffff", size: 88, y: 0.45 },
    });
    if (ending.detail.trim() !== "") {
      tracks = placeOn(tracks, "caption", {
        kind: "caption",
        id: `${ENDING}${newId()}`,
        start,
        duration: ENDING_SECONDS,
        text: ending.detail.trim(),
        style: { preset: "classic", color: "#ffffff", size: 48, y: 0.6 },
      });
    }
    next = { ...base, tracks };
  }
  const music = currentMusic(next);
  return music ? setBackgroundMusic(next, music, newId) : ok(next);
}

/** When the ending card starts, or null when there is none. */
export function endingStart(project: Project): number | null {
  const first = project.tracks.flatMap((track) => track.items).find(isEnding);
  return first ? first.start : null;
}

