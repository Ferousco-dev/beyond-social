export interface Clip {
  readonly id: string;
  readonly label: string;
  readonly startMs: number;
  readonly durationMs: number;
}

export interface Caption {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

export interface MusicTrack {
  readonly id: string;
  readonly title: string;
  readonly durationMs: number;
}

export const CLIPS: readonly Clip[] = [
  { id: "c1", label: "Intro", startMs: 0, durationMs: 6_000 },
  { id: "c2", label: "Product close-up", startMs: 6_000, durationMs: 9_000 },
  { id: "c3", label: "Benefit beat", startMs: 15_000, durationMs: 7_000 },
  { id: "c4", label: "Call to action", startMs: 22_000, durationMs: 8_000 },
];

export const CAPTIONS: readonly Caption[] = [
  { id: "cap1", startMs: 0, endMs: 6_000, text: "New arrivals just dropped" },
  { id: "cap2", startMs: 6_000, endMs: 14_000, text: "Built for the trail" },
  { id: "cap3", startMs: 14_000, endMs: 24_000, text: "Grip that lasts" },
  { id: "cap4", startMs: 24_000, endMs: 30_000, text: "Shop the collection" },
];

export const MUSIC: readonly MusicTrack[] = [
  { id: "m1", title: "Sunrise Run", durationMs: 32_000 },
  { id: "m2", title: "Momentum", durationMs: 28_000 },
  { id: "m3", title: "Golden Hour", durationMs: 41_000 },
  { id: "m4", title: "City Lights", durationMs: 36_000 },
];
