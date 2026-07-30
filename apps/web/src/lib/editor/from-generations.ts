import {
  DEFAULT_FILTERS,
  DEFAULT_TRANSFORM,
  type Project,
  type Track,
  type VideoItem,
} from "./types";

/**
 * Building a timeline from what the project actually rendered.
 *
 * The editor opened onto a hardcoded four-clip template regardless of the
 * project, so every timeline showed the same invented cuts and captions. This
 * assembles the real thing: one clip per finished generation, laid end to end in
 * the order they were made.
 *
 * A project with no finished render gets the empty tracks rather than the
 * template. Showing four clips that do not exist is worse than showing none.
 */

/** kie.ai renders a fixed set of lengths; 8s is its default. */
const FALLBACK_CLIP_MS = 8_000;

export interface GenerationClip {
  readonly id: string;
  readonly prompt: string;
  readonly resultUrl: string | null;
  readonly durationSeconds: number | null;
}

function emptyTracks(): Track[] {
  return [
    {
      id: "t-video",
      kind: "video",
      label: "Video",
      muted: false,
      hidden: false,
      locked: false,
      items: [],
    },
    {
      id: "t-overlay",
      kind: "overlay",
      label: "Overlay",
      muted: false,
      hidden: false,
      locked: false,
      items: [],
    },
    {
      id: "t-text",
      kind: "text",
      label: "Text",
      muted: false,
      hidden: false,
      locked: false,
      items: [],
    },
    {
      id: "t-audio",
      kind: "audio",
      label: "Audio",
      muted: false,
      hidden: false,
      locked: false,
      items: [],
    },
  ];
}

/** The first clause of the prompt, which is what the shot actually is. */
function labelFor(prompt: string, index: number): string {
  const firstClause = prompt.split(/[,.]/)[0]?.trim() ?? "";
  if (firstClause === "") return `Clip ${index + 1}`;
  return firstClause.length > 42 ? `${firstClause.slice(0, 39)}...` : firstClause;
}

export function projectFromGenerations(generations: readonly GenerationClip[]): Project {
  const tracks = emptyTracks();
  let cursor = 0;

  const items: VideoItem[] = generations.map((generation, index) => {
    const durationMs = (generation.durationSeconds ?? FALLBACK_CLIP_MS / 1000) * 1000;
    const item: VideoItem = {
      id: `gen-${generation.id}`,
      kind: "video",
      label: labelFor(generation.prompt, index),
      startMs: cursor,
      durationMs,
      speed: 1,
      volume: 0.8,
      opacity: 1,
      transform: DEFAULT_TRANSFORM,
      filters: DEFAULT_FILTERS,
      // No transition on the first clip: there is nothing to transition from.
      transitionIn: index === 0 ? "none" : "dissolve",
      transitionMs: 400,
      ...(generation.resultUrl ? { sourceUrl: generation.resultUrl } : {}),
      generationId: generation.id,
    };
    cursor += durationMs;
    return item;
  });

  const video = tracks[0];
  if (video) tracks[0] = { ...video, items };
  return { tracks };
}

/** The starting state for a project that has rendered nothing yet. */
export function emptyProject(): Project {
  return { tracks: emptyTracks() };
}
