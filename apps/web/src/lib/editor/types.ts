/**
 * The editor's domain model.
 *
 * A project is a list of tracks; a track is a list of items. Every item carries
 * its own properties (speed, volume, transform, filters) so panels edit one
 * object rather than reaching into scattered arrays, and so undo/redo can snapshot
 * the whole project cheaply.
 */

export type TrackKind = "video" | "overlay" | "text" | "audio";

export const TRANSITIONS = ["none", "fade", "dissolve", "slide", "zoom"] as const;
export type TransitionKind = (typeof TRANSITIONS)[number];

export const TEXT_ANIMATIONS = ["none", "fade", "pop", "typewriter", "slide-up"] as const;
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];

/** Position is a percentage of the frame, so it survives aspect-ratio changes. */
export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  /** Negative is cooler, positive is warmer. */
  temperature: number;
  blur: number;
}

export interface TextStyle {
  fontSize: number;
  color: string;
  background: string | null;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  align: "left" | "center" | "right";
  animation: TextAnimation;
}

interface BaseItem {
  readonly id: string;
  readonly startMs: number;
  readonly durationMs: number;
}

export interface VideoItem extends BaseItem {
  readonly kind: "video";
  readonly label: string;
  /** Playback rate; the timeline length already reflects it. */
  readonly speed: number;
  readonly volume: number;
  readonly opacity: number;
  readonly transform: Transform;
  readonly filters: Filters;
  readonly transitionIn: TransitionKind;
  readonly transitionMs: number;
}

export interface TextItem extends BaseItem {
  readonly kind: "text";
  readonly text: string;
  readonly style: TextStyle;
}

export interface AudioItem extends BaseItem {
  readonly kind: "audio";
  readonly title: string;
  readonly volume: number;
  readonly fadeInMs: number;
  readonly fadeOutMs: number;
}

export type EditorItem = VideoItem | TextItem | AudioItem;

export interface Track {
  readonly id: string;
  readonly kind: TrackKind;
  readonly label: string;
  readonly muted: boolean;
  readonly hidden: boolean;
  readonly locked: boolean;
  readonly items: readonly EditorItem[];
}

export interface Project {
  readonly tracks: readonly Track[];
}

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

export const DEFAULT_FILTERS: Filters = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  blur: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 32,
  color: "#ffffff",
  background: null,
  bold: true,
  italic: false,
  uppercase: false,
  align: "center",
  animation: "fade",
};

/** Shortest an item may be trimmed to, so an edge drag can never erase it. */
export const MIN_ITEM_MS = 500;

export function isVideo(item: EditorItem): item is VideoItem {
  return item.kind === "video";
}

export function isText(item: EditorItem): item is TextItem {
  return item.kind === "text";
}

export function isAudio(item: EditorItem): item is AudioItem {
  return item.kind === "audio";
}

/** End of the last item on any track. */
export function projectDurationMs(project: Project): number {
  return project.tracks.reduce(
    (end, track) =>
      track.items.reduce(
        (trackEnd, item) => Math.max(trackEnd, item.startMs + item.durationMs),
        end,
      ),
    0,
  );
}

export function findItem(
  project: Project,
  id: string,
): { track: Track; item: EditorItem } | undefined {
  for (const track of project.tracks) {
    const item = track.items.find((candidate) => candidate.id === id);
    if (item) return { track, item };
  }
  return undefined;
}
