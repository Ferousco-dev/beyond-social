import { z } from "zod";

/**
 * The cut, as the web app writes it.
 *
 * Restated here rather than imported. This is a wire contract between two
 * separately deployed processes, and a shared type would let a change on one
 * side compile against a worker that has not been redeployed. A mismatch should
 * fail loudly at parse time on the worker, which is what these schemas do.
 *
 * Kept in step with `apps/web/src/lib/editor/render-spec.ts` by hand, which is
 * the cost of that safety and is deliberate.
 */

export const renderClipSchema = z.object({
  path: z.string().min(1),
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  volume: z.number().min(0).max(1),
});

export const renderSpecSchema = z.object({
  version: z.literal(1),
  clips: z.array(renderClipSchema).min(1).max(20),
});

export type RenderClip = z.infer<typeof renderClipSchema>;
export type RenderSpec = z.infer<typeof renderSpecSchema>;

/**
 * Falls back to joining the paths whole.
 *
 * Rows queued before the spec column existed carry only `clip_paths`, and that
 * is exactly what they were queued expecting: joined end to end, untrimmed.
 * Refusing them would strand work somebody already asked for.
 */
export function specOrWholeClips(spec: unknown, clipPaths: readonly string[]): RenderSpec | null {
  const parsed = renderSpecSchema.safeParse(spec);
  if (parsed.success) return parsed.data;

  if (clipPaths.length === 0) return null;
  return {
    version: 1,
    clips: clipPaths.map((path) => ({
      path,
      startSeconds: 0,
      // Zero would be an empty cut, so a whole clip is expressed as "past the
      // end" and ffmpeg is left to stop at the real end of the file.
      endSeconds: Number.MAX_SAFE_INTEGER / 1000,
      volume: 1,
    })),
  };
}
