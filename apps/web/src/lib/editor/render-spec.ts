import { z } from "zod";

import { isVideo, type Project } from "./types";

/**
 * The cut, as an instruction a worker can follow.
 *
 * Derived from the timeline rather than being the timeline. The editor document
 * is the user's authored state and will keep changing shape; this is a contract
 * between the web app and the render worker, and the worker should fail on
 * something it does not understand rather than quietly drop a field it was never
 * taught about.
 *
 * What it carries is what version one of the export honours: order, trims and
 * level. Captions, grades and transforms are authored in the editor and are not
 * in here, which is a real gap and is stated in the interface rather than
 * discovered by watching them vanish from the finished file.
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

/** Milliseconds, as seconds with millisecond precision and no float noise. */
function seconds(ms: number): number {
  return Math.round(ms) / 1000;
}

/**
 * Reads the cut off the video track.
 *
 * Only the video track. Overlay, text and audio are authored on their own lanes
 * and none of them survive this version of the export, so pretending to read
 * them would be worse than the gap being obvious.
 *
 * A clip's position on the timeline is where it plays, and `trimStartMs` is
 * where it starts inside its own file; the two are independent and only the
 * second matters to a worker cutting the source.
 */
export function specFromProject(
  project: Project,
  pathByGeneration: ReadonlyMap<string, string>,
): RenderSpec | null {
  const track = project.tracks.find((candidate) => candidate.kind === "video");
  if (!track || track.hidden) return null;

  const clips = [...track.items]
    .filter(isVideo)
    .sort((left, right) => left.startMs - right.startMs)
    .flatMap((item) => {
      // A clip whose generation has been deleted has no file to cut. Dropping it
      // is the only honest option, and the caller compares counts so the user
      // can be told rather than handed a shorter video with no explanation.
      const path = item.generationId ? pathByGeneration.get(item.generationId) : undefined;
      if (!path) return [];

      const start = seconds(item.sourceStartMs ?? 0);
      const end = start + seconds(item.durationMs * item.speed);
      if (end <= start) return [];

      return [
        {
          path,
          startSeconds: start,
          endSeconds: end,
          // The track's mute outranks the clip's own level, matching the preview.
          volume: track.muted ? 0 : item.volume,
        },
      ];
    });

  return clips.length === 0 ? null : { version: 1, clips };
}
