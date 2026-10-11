/**
 * What to offer once a video has landed.
 *
 * A finished draft used to be the end of the thread. The reply said what was
 * made and then nothing, so every follow-up was typed from a blank composer,
 * and the most common next thought after watching a first cut, "shorter", took
 * as much effort to express as the original brief.
 *
 * Derived in code from the prompt that produced it, never from a model. The
 * same reasoning as `needsClarification`: these are checkable facts about what
 * was asked for, a model call would put a round trip and a cost in front of
 * three chips, and a suggestion that arrives after the user has already started
 * typing is worse than none.
 *
 * They are adjustments rather than new briefs, so taking one reads against the
 * video on screen and is classified `adjust`, which is the cheap path.
 */

export interface FollowUp {
  /** What the chip says. */
  readonly label: string;
  /** What it puts in the composer, phrased as the user would say it. */
  readonly prompt: string;
}

/** The levers of a short video, in the order a first cut usually needs them. */
const LEVERS: readonly (FollowUp & { readonly skipWhen: RegExp })[] = [
  {
    label: "Shorter",
    prompt: "Make it shorter and tighter, without losing the point.",
    // They already named a length, so offering to change it reads as not having
    // read the brief.
    skipWhen:
      /\b(\d+\s*(s|sec|secs|second|seconds|m|min|minute|minutes)|short|long|brief|quick)\b/i,
  },
  {
    label: "Different opening",
    prompt: "Try a different opening shot. Same idea, but hook me another way.",
    skipWhen: /\b(hook|open(ing|s)?|first (shot|frame|second|seconds)|start(s|ing)? with)\b/i,
  },
  {
    label: "More energy",
    prompt: "Pick up the pace and give it more energy.",
    skipWhen: /\b(fast|slow|pace|pacing|energ(y|etic)|calm|relaxed|punchy|snappy)\b/i,
  },
  {
    label: "Different mood",
    prompt: "Keep the structure but change the mood and the look.",
    skipWhen: /\b(mood|tone|feel|vibe|aesthetic|look and feel|cinematic|moody)\b/i,
  },
];

/** Never more than this: a row of chips is a nudge, not a menu. */
const MOST = 3;

/**
 * Suggestions for the turn that produced this video.
 *
 * `prompt` is what the user asked for, so anything they already specified is
 * dropped rather than offered back to them. An empty result is a normal
 * outcome, meaning the brief was detailed enough that every lever was already
 * pulled, and the interface shows nothing rather than padding to three.
 */
export function followUpsFor(prompt: string): readonly FollowUp[] {
  const said = prompt.trim();
  if (said === "") return [];

  return LEVERS.filter((lever) => !lever.skipWhen.test(said))
    .slice(0, MOST)
    .map(({ label, prompt: suggestion }) => ({ label, prompt: suggestion }));
}
