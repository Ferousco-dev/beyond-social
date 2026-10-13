import { z } from "zod";

/** The shortest an item may be, in seconds. Anything shorter is unselectable on a timeline. */
export const MIN_DURATION = 0.1;

const timing = { id: z.string().min(1).max(64), start: z.number().min(0), duration: z.number().min(MIN_DURATION) };

const mediaFields = {
  ...timing,
  /** A reference to uploaded media, resolved to a playable address when the editor opens. */
  src: z.string().min(1).max(512),
  /** Where in the source this item begins, in seconds. */
  trimIn: z.number().min(0),
  /** Length of the whole source, which bounds how far an item can be extended. */
  sourceDuration: z.number().min(MIN_DURATION),
  volume: z.number().min(0).max(2),
};

export const CAPTION_PRESETS = ["classic", "karaoke", "pill", "box", "minimal"] as const;
export type CaptionPreset = (typeof CAPTION_PRESETS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const captionStyleSchema = z.object({
  /** How words are drawn. Projects saved before presets existed read as classic. */
  preset: z.enum(CAPTION_PRESETS).optional(),
  color: hex,
  /** The colour of the word being spoken, for presets that mark it. */
  highlight: hex.optional(),
  size: z.number().min(8).max(200),
  /** Vertical position as a fraction of the frame height, 0 at the top. */
  y: z.number().min(0).max(1),
});
export type CaptionStyle = z.infer<typeof captionStyleSchema>;

export const wordSchema = z.object({ text: z.string().max(80), start: z.number().min(0), end: z.number().min(0) });

export const itemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("video"), ...mediaFields }),
  z.object({ kind: z.literal("audio"), ...mediaFields }),
  z.object({
    kind: z.literal("image"),
    ...timing,
    src: z.string().min(1).max(512),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.05).max(4),
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
export type ItemKind = Item["kind"];

/** Which kind of item each kind of track holds. */
export const TRACK_ACCEPTS = { video: "video", audio: "audio", overlay: "image", caption: "caption" } as const;
export type TrackKind = keyof typeof TRACK_ACCEPTS;

export const trackSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["video", "audio", "overlay", "caption"]),
  items: z.array(itemSchema).max(500),
});
export type Track = z.infer<typeof trackSchema>;

export const projectSchema = z.object({
  version: z.literal(1),
  width: z.number().int().min(16).max(4096),
  height: z.number().int().min(16).max(4096),
  fps: z.number().min(1).max(120),
  tracks: z.array(trackSchema).max(24),
});
export type Project = z.infer<typeof projectSchema>;

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };
