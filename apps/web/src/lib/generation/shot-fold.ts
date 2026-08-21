import { limitsFor } from "./model-limits";

/**
 * What to do with a shot list the chosen model cannot cut.
 *
 * Only Kling takes beats in one call. The dispatcher refuses a shot list sent
 * to anything else rather than dropping it, which is right: silently rendering
 * one continuous take for somebody who asked for five bills them in full for
 * something they did not ask for. But the refusal arrives as a failed turn, and
 * for a free account, whose everyday generator is Veo, that is the only thing
 * the composer's shot editor could ever produce.
 *
 * So the beats are folded into the brief instead. The result is one take rather
 * than five cuts, which is a real difference and is said out loud, but it is a
 * video made from what the user wrote rather than an error.
 */

export interface Beat {
  readonly prompt: string;
  readonly duration: number;
}

export interface FoldedShots {
  /** The beats to dispatch, or undefined when they were folded into the brief. */
  readonly shots: readonly Beat[] | undefined;
  /** Appended to the brief when the model cannot cut. Empty otherwise. */
  readonly addendum: string;
  /** Said to the user when the shape of their request changed. Null otherwise. */
  readonly notice: string | null;
}

const NOTHING: FoldedShots = { shots: undefined, addendum: "", notice: null };

export function foldShots(
  shots: readonly Beat[] | undefined,
  model: string | null | undefined,
): FoldedShots {
  if (shots === undefined || shots.length === 0) return NOTHING;
  if (limitsFor(model).multiShot) return { shots, addendum: "", notice: null };

  const scenes = shots
    .map((shot, index) => `${index + 1}. (${shot.duration}s) ${shot.prompt}`)
    .join("\n");

  return {
    shots: undefined,
    addendum: `Run through these beats in order, in one continuous take:\n${scenes}`,
    notice: `This model cannot cut between shots, so your ${shots.length} beats become one continuous take that moves through them.`,
  };
}
