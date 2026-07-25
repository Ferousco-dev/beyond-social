import {
  DEFAULT_FILTERS,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TRANSFORM,
  type AudioItem,
  type Project,
  type TextItem,
  type VideoItem,
} from "./types";

/** Placeholder project until generations are loaded from the database. */

function video(
  id: string,
  label: string,
  startMs: number,
  durationMs: number,
  transitionIn: VideoItem["transitionIn"] = "none",
): VideoItem {
  return {
    id,
    kind: "video",
    label,
    startMs,
    durationMs,
    speed: 1,
    volume: 0.8,
    opacity: 1,
    transform: DEFAULT_TRANSFORM,
    filters: DEFAULT_FILTERS,
    transitionIn,
    transitionMs: 400,
  };
}

function text(id: string, value: string, startMs: number, durationMs: number): TextItem {
  return { id, kind: "text", text: value, startMs, durationMs, style: DEFAULT_TEXT_STYLE };
}

function audio(id: string, title: string, startMs: number, durationMs: number): AudioItem {
  return {
    id,
    kind: "audio",
    title,
    startMs,
    durationMs,
    volume: 0.5,
    fadeInMs: 800,
    fadeOutMs: 1200,
  };
}

export const INITIAL_PROJECT: Project = {
  tracks: [
    {
      id: "t-video",
      kind: "video",
      label: "Video",
      muted: false,
      hidden: false,
      locked: false,
      items: [
        video("c1", "Intro", 0, 6_000),
        video("c2", "Product close-up", 6_000, 9_000, "dissolve"),
        video("c3", "Benefit beat", 15_000, 7_000, "fade"),
        video("c4", "Call to action", 22_000, 8_000, "slide"),
      ],
    },
    {
      id: "t-overlay",
      kind: "overlay",
      label: "Overlay",
      muted: false,
      hidden: false,
      locked: false,
      items: [video("o1", "Logo sting", 24_000, 4_000, "fade")],
    },
    {
      id: "t-text",
      kind: "text",
      label: "Text",
      muted: false,
      hidden: false,
      locked: false,
      items: [
        text("cap1", "New arrivals just dropped", 0, 6_000),
        text("cap2", "Built for the trail", 6_000, 8_000),
        text("cap3", "Grip that lasts", 14_000, 10_000),
        text("cap4", "Shop the collection", 24_000, 6_000),
      ],
    },
    {
      id: "t-audio",
      kind: "audio",
      label: "Audio",
      muted: false,
      hidden: false,
      locked: false,
      items: [audio("a1", "Sunrise Run", 0, 30_000)],
    },
  ],
};

export interface MusicTrack {
  readonly id: string;
  readonly title: string;
  readonly durationMs: number;
}

export const MUSIC_LIBRARY: readonly MusicTrack[] = [
  { id: "m1", title: "Sunrise Run", durationMs: 32_000 },
  { id: "m2", title: "Momentum", durationMs: 28_000 },
  { id: "m3", title: "Golden Hour", durationMs: 41_000 },
  { id: "m4", title: "City Lights", durationMs: 36_000 },
];

/** Stock shots a user can drop onto the timeline. */
export const MEDIA_LIBRARY: ReadonlyArray<{ id: string; label: string; durationMs: number }> = [
  { id: "lib-1", label: "Product macro", durationMs: 5_000 },
  { id: "lib-2", label: "Lifestyle wide", durationMs: 6_000 },
  { id: "lib-3", label: "Hands detail", durationMs: 4_000 },
  { id: "lib-4", label: "Logo sting", durationMs: 3_000 },
];
