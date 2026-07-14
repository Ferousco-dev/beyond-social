export interface Clip {
  readonly id: string;
  readonly label: string;
  readonly grow: number;
}

export interface Caption {
  readonly id: string;
  readonly time: string;
  readonly text: string;
}

export interface MusicTrack {
  readonly id: string;
  readonly title: string;
  readonly length: string;
}

export const CLIPS: readonly Clip[] = [
  { id: "c1", label: "Intro", grow: 2 },
  { id: "c2", label: "Product close-up", grow: 3 },
  { id: "c3", label: "Benefit beat", grow: 2 },
  { id: "c4", label: "Call to action", grow: 2 },
];

export const CAPTIONS: readonly Caption[] = [
  { id: "cap1", time: "0:00", text: "New arrivals just dropped" },
  { id: "cap2", time: "0:06", text: "Built for the trail" },
  { id: "cap3", time: "0:14", text: "Grip that lasts" },
  { id: "cap4", time: "0:24", text: "Shop the collection" },
];

export const MUSIC: readonly MusicTrack[] = [
  { id: "m1", title: "Sunrise Run", length: "0:32" },
  { id: "m2", title: "Momentum", length: "0:28" },
  { id: "m3", title: "Golden Hour", length: "0:41" },
  { id: "m4", title: "City Lights", length: "0:36" },
];

export const RULER = ["0:00", "0:06", "0:12", "0:18", "0:24", "0:30"] as const;
