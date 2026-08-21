import { totalSeconds, type ScriptScene } from "./schema";

/**
 * The scene structure as first written, captured once so a later edit has
 * something concrete to diverge from.
 *
 * `PostAnalysis` never captures the source video's own duration, cut count,
 * or rhythm (see `lib/tiktok/analyse.ts`: it is read from a caption and a
 * transcript, never the video itself), so there is no original pattern to
 * compare live edits against directly. The closest real substitute is the
 * script the writer produced from the analysis: it was generated under an
 * explicit instruction to keep the source's mechanics (`lib/script/write.ts`),
 * so its scene count, total length, and hook length are the pattern the user
 * is actually editing away from. Comparing against that is grounded in a real
 * value that was really computed; comparing against a number nobody has would
 * not be.
 */
export interface ScriptBaseline {
  readonly totalSeconds: number;
  readonly sceneCount: number;
  readonly hookSeconds: number;
}

export function captureBaseline(scenes: readonly ScriptScene[]): ScriptBaseline {
  return {
    totalSeconds: totalSeconds(scenes),
    sceneCount: scenes.length,
    hookSeconds: scenes[0]?.seconds ?? 0,
  };
}

export interface DivergenceWarning {
  readonly message: string;
  readonly recommendation: string;
}

/**
 * How far the total is allowed to drift before it stops reading as the same
 * pacing. Twenty percent is roughly the size of two or three stepper clicks
 * on a script this short (MAX_TOTAL_SECONDS is 15), which is about the
 * smallest edit that changes the rhythm rather than just rounding it.
 */
const DURATION_DRIFT_THRESHOLD = 0.2;

/**
 * The writer is told the hook lands inside its first second (`write.ts`).
 * Doubling its length is the point a scene stops behaving like a hook and
 * starts behaving like a regular beat.
 */
const HOOK_STRETCH_FACTOR = 2;

/**
 * Compares the live scenes against the baseline and returns at most one
 * warning: the point isn't to list every drift, it's to say the one thing
 * worth reconsidering before the video is rendered.
 */
export function computeDivergence(
  baseline: ScriptBaseline,
  scenes: readonly ScriptScene[],
): DivergenceWarning | null {
  if (baseline.totalSeconds === 0) return null;

  if (scenes.length < baseline.sceneCount) {
    return {
      message: `This change may reduce the video's similarity to the original retention structure: it now has ${scenes.length} scene${scenes.length === 1 ? "" : "s"}, down from the ${baseline.sceneCount} it was written with.`,
      recommendation: `Keep at least ${baseline.sceneCount} scenes so the arc the analysis found still has room to play out.`,
    };
  }

  const total = totalSeconds(scenes);
  const durationDrift = (total - baseline.totalSeconds) / baseline.totalSeconds;
  if (Math.abs(durationDrift) > DURATION_DRIFT_THRESHOLD) {
    const low = Math.round(baseline.totalSeconds * (1 - DURATION_DRIFT_THRESHOLD));
    const high = Math.round(baseline.totalSeconds * (1 + DURATION_DRIFT_THRESHOLD));
    return {
      message: `This change may reduce the video's similarity to the original retention structure: it now runs ${total}s, ${durationDrift > 0 ? "longer" : "shorter"} than the ${baseline.totalSeconds}s it was written to.`,
      recommendation: `Keep the video between ${low}-${high} seconds to preserve the original pacing pattern.`,
    };
  }

  const hook = scenes[0];
  if (hook && baseline.hookSeconds > 0 && hook.seconds >= baseline.hookSeconds * HOOK_STRETCH_FACTOR) {
    return {
      message: `This change may reduce the video's similarity to the original retention structure: the hook now runs ${hook.seconds}s, well past the ${baseline.hookSeconds}s it opened with.`,
      recommendation: `Trim the hook back toward ${baseline.hookSeconds}s so it still lands fast.`,
    };
  }

  return null;
}
