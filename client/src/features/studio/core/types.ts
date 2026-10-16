import { z } from "zod";

/** The shortest an item may be, in seconds. Anything shorter is unselectable on a timeline. */
export const MIN_DURATION = 0.1;

const timing = { id: z.string().min(1).max(64), start: z.number().min(0), duration: z.number().min(MIN_DURATION) };

export const TRANSITIONS = ["fade", "slide", "zoom", "wipe"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

/** How an item comes in. It plays over the first moments of the item. */
const transitionSchema = z.object({ type: z.enum(TRANSITIONS), duration: z.number().min(0.1).max(3) });
export type Transition = z.infer<typeof transitionSchema>;

/**
 * A moment where an item's position, size or opacity is pinned. Between
 * moments the value glides. `t` counts from the start of the item.
 */
const keyframeSchema = z.object({
  t: z.number().min(0),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  scale: z.number().min(0.05).max(4).optional(),
  opacity: z.number().min(0).max(1).optional(),
});
export type Keyframe = z.infer<typeof keyframeSchema>;

const animation = {
  transition: transitionSchema.optional(),
  keyframes: z.array(keyframeSchema).max(30).optional(),
};

const mediaFields = {
  ...timing,
  /** A reference to uploaded media, resolved to a playable address when the editor opens. */
  src: z.string().min(1).max(512),
  /** Where in the source this item begins, in seconds. */
  trimIn: z.number().min(0),
  /** Length of the whole source, which bounds how far an item can be extended. */
  sourceDuration: z.number().min(MIN_DURATION),
  volume: z.number().min(0).max(2),
  /** Playback speed. The item's length on the timeline is its source length divided by this. */
  speed: z.number().min(0.25).max(4).optional(),
};

export const CAPTION_PRESETS = ["classic", "karaoke", "pill", "box", "minimal"] as const;
export type CaptionPreset = (typeof CAPTION_PRESETS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const captionStyleSchema = z.object({
  /** How words are drawn. Projects saved before presets existed read as classic. */
  preset: z.enum(CAPTION_PRESETS).optional(),
  color: hex,
  /** Horizontal centre as a fraction of the frame width. Absent means the middle. */
  x: z.number().min(0).max(1).optional(),
  /** The colour of the word being spoken, for presets that mark it. */
  highlight: hex.optional(),
  size: z.number().min(8).max(200),
  /** Vertical position as a fraction of the frame height, 0 at the top. */
  y: z.number().min(0).max(1),
});
export type CaptionStyle = z.infer<typeof captionStyleSchema>;

const wordSchema = z.object({ text: z.string().max(80), start: z.number().min(0), end: z.number().min(0) });

export const itemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("video"), ...mediaFields, ...animation }),
  z.object({ kind: z.literal("audio"), ...mediaFields }),
  z.object({
    kind: z.literal("image"),
    ...timing,
    src: z.string().min(1).max(512),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.05).max(4),
    ...animation,
  }),
  z.object({
    kind: z.literal("text"),
    ...timing,
    text: z.string().max(500),
    style: captionStyleSchema,
    ...animation,
  }),
  z.object({
    kind: z.literal("caption"),
    ...timing,
    text: z.string().max(500),
    /** Word timings relative to the start of the item, when the caption came from speech. */
    words: z.array(wordSchema).max(200).optional(),
    style: captionStyleSchema,
  }),
]);
export type Item = z.infer<typeof itemSchema>;

/** Which kind of item each kind of track holds. */
export const TRACK_ACCEPTS = { text: "text", video: "video", audio: "audio", overlay: "image", caption: "caption" } as const;
export type TrackKind = keyof typeof TRACK_ACCEPTS;

const trackSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["text", "video", "audio", "overlay", "caption"]),
  items: z.array(itemSchema).max(500),
});
export type Track = z.infer<typeof trackSchema>;

/** A file brought into the project, kept so it can be placed on the timeline again. */
export const assetSchema = z.object({
  src: z.string().min(1).max(512),
  name: z.string().min(1).max(120),
  kind: z.enum(["video", "audio", "image"]),
  duration: z.number().min(0).optional(),
});
export type Asset = z.infer<typeof assetSchema>;

export const projectGenerationSchema = z.object({
  jobId: z.string().uuid(),
  script: z.string().max(2500),
  state: z.enum(["running", "completed", "failed"]),
  message: z.string().max(500).optional(),
});
export type ProjectGeneration = z.infer<typeof projectGenerationSchema>;

export const projectSchema = z.object({
  version: z.literal(1),
  width: z.number().int().min(16).max(4096),
  height: z.number().int().min(16).max(4096),
  fps: z.number().min(1).max(120),
  tracks: z.array(trackSchema).max(24),
  assets: z.array(assetSchema).max(100).optional(),
  generation: projectGenerationSchema.optional(),
});
export type Project = z.infer<typeof projectSchema>;

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };
