import { z } from "zod";

import { TEXT_ANIMATIONS, TRANSITIONS, type Project } from "./types";

/**
 * Runtime shape of a saved editor document.
 *
 * The document round-trips through the browser, so what comes back is untrusted
 * even though it is the user's own data: a stale client, a half-finished
 * migration, or a hand-edited request can all produce something that no longer
 * matches the type. Parsing it means a bad document degrades to a fresh project
 * instead of crashing the editor with an undefined deep in a render.
 *
 * Bounds are generous but present. They exist to stop a single project growing
 * until it cannot be loaded, not to express product limits.
 */

const MAX_ITEMS_PER_TRACK = 500;
const MAX_TRACKS = 12;
/** Twelve hours, far past anything short-form, but finite. */
const MAX_MS = 12 * 60 * 60 * 1000;

const ms = z.number().finite().min(0).max(MAX_MS);

const transformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().finite().min(0.01).max(10),
  rotation: z.number().finite(),
});

const filtersSchema = z.object({
  brightness: z.number().finite(),
  contrast: z.number().finite(),
  saturation: z.number().finite(),
  temperature: z.number().finite(),
  blur: z.number().finite().min(0),
});

const textStyleSchema = z.object({
  fontSize: z.number().finite().min(1).max(400),
  color: z.string().max(64),
  background: z.string().max(64).nullable(),
  bold: z.boolean(),
  italic: z.boolean(),
  uppercase: z.boolean(),
  align: z.enum(["left", "center", "right"]),
  animation: z.enum(TEXT_ANIMATIONS),
});

const baseItem = { id: z.string().min(1).max(120), startMs: ms, durationMs: ms };

const videoItemSchema = z.object({
  ...baseItem,
  kind: z.literal("video"),
  label: z.string().max(200),
  speed: z.number().finite().min(0.1).max(10),
  volume: z.number().finite().min(0).max(2),
  opacity: z.number().finite().min(0).max(1),
  transform: transformSchema,
  filters: filtersSchema,
  transitionIn: z.enum(TRANSITIONS),
  transitionMs: z.number().finite().min(0).max(10_000),
  sourceUrl: z.string().max(2000).optional(),
  generationId: z.string().max(120).optional(),
  // Optional rather than defaulted: a document saved before trims were tracked
  // has no offset, and absent already means zero everywhere it is read.
  sourceStartMs: z.number().finite().min(0).optional(),
});

const textItemSchema = z.object({
  ...baseItem,
  kind: z.literal("text"),
  text: z.string().max(2000),
  style: textStyleSchema,
});

const audioItemSchema = z.object({
  ...baseItem,
  kind: z.literal("audio"),
  title: z.string().max(200),
  volume: z.number().finite().min(0).max(2),
  fadeInMs: z.number().finite().min(0).max(60_000),
  fadeOutMs: z.number().finite().min(0).max(60_000),
});

const itemSchema = z.discriminatedUnion("kind", [videoItemSchema, textItemSchema, audioItemSchema]);

const trackSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["video", "overlay", "text", "audio"]),
  label: z.string().max(120),
  muted: z.boolean(),
  hidden: z.boolean(),
  locked: z.boolean(),
  items: z.array(itemSchema).max(MAX_ITEMS_PER_TRACK),
});

export const projectSchema = z.object({
  tracks: z.array(trackSchema).max(MAX_TRACKS),
});

/**
 * Parses a stored document, returning null when it is not usable.
 *
 * Null rather than a thrown error, because the caller's correct response is to
 * start from a fresh project, not to fail the page.
 */
export function parseProject(value: unknown): Project | null {
  const parsed = projectSchema.safeParse(value);
  return parsed.success ? (parsed.data as Project) : null;
}
