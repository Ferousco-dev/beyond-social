/**
 * How long each model can run, and how it gets longer than that.
 *
 * The dispatcher used to apply one duration rule to every model: `[4, 6, 8]`,
 * which is Veo's set. Veo is the cheap tier, so the whole catalogue was capped
 * at the cheapest model's ceiling. A Kling request that could have run fifteen
 * seconds silently became eight, and asking for twelve fell back to eight
 * rather than being honoured. "The model only gives us 8 seconds" was never
 * true of the models; it was true of this file's predecessor.
 *
 * Numbers below come from each model's own documentation on docs.kie.ai, not
 * from a reseller listing or a blog.
 */

/** How a model produces something longer than one generation. */
export type Continuation =
  /** A dedicated endpoint continues an existing task. Veo only, via /veo/extend. */
  | "native-extend"
  /** The model itself takes a list of shots in one call. Kling's multi_shots. */
  | "native-multi-shot"
  /** No provider support: we stitch clips ourselves and hide the seam. */
  | "frame-chain";

interface DurationRule {
  /** Discrete choices where the provider enumerates them. */
  readonly allowed?: readonly number[];
  /** Inclusive bounds where the provider accepts a range. */
  readonly min?: number;
  readonly max?: number;
  /** Used when the request asks for something unsupported. */
  readonly fallback: number;
}

export interface VideoCapability {
  readonly duration: DurationRule;
  readonly continuation: Continuation;
}

/**
 * Keyed by the id we dispatch, so a model missing here is a model nobody has
 * read the documentation for. `resolveDuration` falls back to the safest
 * possible answer in that case rather than inventing a longer one.
 */
const CAPABILITIES: Readonly<Record<string, VideoCapability>> = {
  // 4, 6 or 8 seconds; reference mode is locked to 8. Extension is a real
  // endpoint here, but only for clips this API generated, and never for 1080p
  // output, which is why 720p remains the default.
  veo3: { duration: { allowed: [4, 6, 8], fallback: 8 }, continuation: "native-extend" },
  veo3_fast: { duration: { allowed: [4, 6, 8], fallback: 8 }, continuation: "native-extend" },
  veo3_lite: { duration: { allowed: [4, 6, 8], fallback: 8 }, continuation: "native-extend" },

  // 3 to 15 seconds in one call, and a multi_shots mode that takes a list of
  // per-shot prompts of 1 to 12 seconds each. Nearly double Veo without any
  // stitching, which is why length should route here rather than to extension.
  "kling-3.0/video": {
    duration: { min: 3, max: 15, fallback: 5 },
    continuation: "native-multi-shot",
  },

  // 4 to 12 seconds. No extend endpoint and no last-frame parameter, so
  // anything longer is ours to stitch.
  "bytedance/seedance-1.5-pro": {
    duration: { min: 4, max: 12, fallback: 5 },
    continuation: "frame-chain",
  },
};

/** The most conservative rule, for a model whose limits are not known. */
const UNKNOWN: VideoCapability = {
  duration: { allowed: [4, 6, 8], fallback: 8 },
  continuation: "frame-chain",
};

export function capabilityOf(model: string): VideoCapability {
  return CAPABILITIES[model] ?? UNKNOWN;
}

/**
 * The duration to actually request for this model.
 *
 * A value outside the model's range is clamped rather than rejected, because a
 * request that asks for twelve seconds wants the longest thing it can have, and
 * failing the whole generation over it would be worse than shortening it. A
 * model with enumerated lengths gets the nearest allowed value for the same
 * reason.
 */
export function resolveDuration(model: string, requested: number | undefined): number {
  const rule = capabilityOf(model).duration;
  if (typeof requested !== "number" || !Number.isFinite(requested)) return rule.fallback;

  if (rule.allowed !== undefined) {
    if (rule.allowed.includes(requested)) return requested;
    // Nearest enumerated value, preferring the shorter on a tie so a request
    // never silently costs more than it asked for.
    return rule.allowed.reduce((best, value) =>
      Math.abs(value - requested) < Math.abs(best - requested) ? value : best,
    );
  }

  const min = rule.min ?? rule.fallback;
  const max = rule.max ?? rule.fallback;
  return Math.min(Math.max(Math.round(requested), min), max);
}

/** The longest single generation this model can produce, for the UI to show. */
export function maxDurationOf(model: string): number {
  const rule = capabilityOf(model).duration;
  return rule.allowed !== undefined ? Math.max(...rule.allowed) : (rule.max ?? rule.fallback);
}

/*
 * Kling's multi-shot limits, from its own documentation. Kept here rather than
 * in the builder because they are facts about the model, and the dispatcher has
 * to check them before it spends anything.
 */
const MAX_SHOTS = 5;
const SHOT_MIN_SECONDS = 1;
const SHOT_MAX_SECONDS = 12;
const SHOT_PROMPT_LIMIT = 500;

export interface ShotInput {
  readonly prompt: string;
  readonly duration: number;
}

/** Raised before dispatch, so a rejected shot list costs nothing. */
export class ShotsNotSupportedError extends Error {
  constructor(model: string) {
    super(`${model} cannot take a shot list: it generates one shot per request`);
    this.name = "ShotsNotSupportedError";
  }
}

/**
 * Validates and normalises a requested shot list.
 *
 * Refusing rather than dropping is the same rule the input builders follow. A
 * shot list quietly ignored by a model that cannot cut would bill the user for
 * a single continuous take when they asked for five beats, and nothing in the
 * response would say so.
 *
 * Within a model that does support it the values are clamped, not rejected,
 * because the caller's intent is clear and a shortened beat is a better answer
 * than a failed generation. The total is bounded by the model's own duration
 * rule, so the shots cannot add up to something the provider will refuse.
 */
export function resolveShots(
  model: string,
  requested: readonly ShotInput[] | undefined,
): readonly ShotInput[] {
  if (requested === undefined || requested.length === 0) return [];
  if (capabilityOf(model).continuation !== "native-multi-shot") {
    throw new ShotsNotSupportedError(model);
  }

  const usable = requested
    .filter((shot) => typeof shot?.prompt === "string" && shot.prompt.trim() !== "")
    .slice(0, MAX_SHOTS)
    .map((shot) => ({
      prompt: shot.prompt.trim().slice(0, SHOT_PROMPT_LIMIT),
      duration: Math.min(Math.max(Math.round(shot.duration), SHOT_MIN_SECONDS), SHOT_MAX_SECONDS),
    }));
  if (usable.length === 0) return [];

  // The beats must also fit the model's total, so a five-shot list of twelve
  // seconds each is trimmed to what the provider will actually accept rather
  // than sent and refused.
  const total = maxDurationOf(model);
  const kept: ShotInput[] = [];
  let spent = 0;
  for (const shot of usable) {
    if (spent >= total) break;
    const duration = Math.min(shot.duration, total - spent);
    if (duration < SHOT_MIN_SECONDS) break;
    kept.push({ prompt: shot.prompt, duration });
    spent += duration;
  }
  return kept;
}
