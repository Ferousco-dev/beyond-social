/**
 * The stock media and music the editor panels offer.
 *
 * This file used to also export a four-clip timeline that every project opened
 * onto, whatever the user had actually made. Timelines are built from the
 * project's own renders now, so only the libraries remain.
 */

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
