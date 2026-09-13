import { totalSeconds, type ScriptMechanics, type ScriptScene } from "./schema";

/**
 * How much each characteristic the analysis surfaced is estimated to matter
 * for retention specifically, not production quality generally.
 *
 * Two of these are read straight off this script's own numbers, because the
 * data to compute them exists: how many attention techniques the analysis
 * found, and how often the picture actually cuts. The other two are fixed
 * rather than pretending to be computed, because nothing in a `VideoScript`
 * bears on them: `PostAnalysis` never captured the source's visual style or
 * music (see `lib/tiktok/analyse.ts`), and a hook's dominance over
 * completion rate is a property of *where it sits* in the timeline, not of
 * this particular script's content.
 */
export type ImpactLevel = "High" | "Medium" | "Low";

/** For anything this short, whether the opening seconds work is consistently
 * the largest single driver of watch-through, ahead of what follows it. */
export const HOOK_IMPACT: ImpactLevel = "High";

/** A call to action is read after someone has already decided to keep
 * watching, so it shapes what they do next rather than whether they stayed
 * this far. Low on a scale about retention specifically, not about value. */
export const CTA_IMPACT: ImpactLevel = "Low";

/** One cut every 2.5s or faster. */
const CUTS_PER_SECOND_HIGH = 0.4;
/** One cut every 4s or faster. */
const CUTS_PER_SECOND_MEDIUM = 0.25;

/**
 * More named techniques in `mechanics.retention` means the analysis found
 * more distinct things holding attention through the video, not just the
 * hook. That count is the one signal this pipeline already extracts for
 * "how much is pacing doing here", so it is read rather than re-guessed.
 */
export function paceImpact(mechanics: ScriptMechanics): ImpactLevel {
  if (mechanics.retention.length >= 2) return "High";
  if (mechanics.retention.length === 1) return "Medium";
  return "Low";
}

/**
 * Cuts per second of the script as currently written. Frequent cuts are one
 * of the best-documented levers on short-form average view duration, and
 * unlike `pacing`'s free text, scene count and total seconds are exact
 * numbers already on the script.
 */
export function sceneChangeImpact(scenes: readonly ScriptScene[]): ImpactLevel {
  const seconds = totalSeconds(scenes);
  if (seconds === 0) return "Low";
  const cutsPerSecond = scenes.length / seconds;
  if (cutsPerSecond >= CUTS_PER_SECOND_HIGH) return "High";
  if (cutsPerSecond >= CUTS_PER_SECOND_MEDIUM) return "Medium";
  return "Low";
}
