import { z } from "zod";

/**
 * The cut, as the app on the other side of the queue wrote it.
 *
 * Mirrors `apps/web/src/lib/editor/render-spec.ts`, which is where this is
 * actually authored. The two cannot share a module across separate build
 * targets (a Next.js app and a standalone worker), so this is the worker's own
 * copy of the same contract, and the two have to be changed together.
 *
 * Parsed rather than cast: `spec` arrives as `jsonb` off a queue job, and a row
 * old enough to predate this column, or malformed in a way nothing here wrote,
 * is safer rendered as a whole join of `clipPaths` than run against fields that
 * turned out to be `undefined`.
 */
export const renderClipSchema = z.object({
  /** Object path in the `renders` bucket. Never a signed URL: those expire. */
  path: z.string().min(1),
  /** Where the cut starts inside the source file. */
  startSeconds: z.number().min(0),
  /** Where it ends. Always greater than `startSeconds`. */
  endSeconds: z.number().positive(),
  /** 0 to 1. Zero is a muted clip, which is a normal thing to want. */
  volume: z.number().min(0).max(1),
});

export const renderSpecSchema = z.object({
  version: z.literal(1),
  clips: z.array(renderClipSchema).min(1).max(20),
});

export type RenderClip = z.infer<typeof renderClipSchema>;
export type RenderSpec = z.infer<typeof renderSpecSchema>;

/** Null on anything that doesn't parse: an absent spec, or a shape this worker predates. */
export function parseRenderSpec(value: unknown): RenderSpec | null {
  if (value === null || value === undefined) return null;
  const parsed = renderSpecSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
