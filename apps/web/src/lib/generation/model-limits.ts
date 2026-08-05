/**
 * What each model can do, for the parts of the product the browser sees.
 *
 * A deliberate mirror of `supabase/functions/_shared/video-capabilities.ts`.
 * The edge functions run on Deno and cannot import from this workspace, so the
 * two cannot share a module. They must be changed together, and the edge copy
 * is the authority: it is the one that decides what is actually sent.
 *
 * This exists because the web app had its own hardcoded `[4, 6, 8]`, which is
 * Veo's set. Fixing only the dispatcher would have left a user asking for a
 * fifteen-second Kling clip being told that clips can be four, six or eight
 * seconds long, which is the app refusing something it can do.
 */

export interface ModelLimits {
  /** Enumerated lengths, for models that publish a fixed set. */
  readonly allowed?: readonly number[];
  readonly min?: number;
  readonly max?: number;
  /** Whether the model cuts between beats itself in a single call. */
  readonly multiShot: boolean;
}

const LIMITS: Readonly<Record<string, ModelLimits>> = {
  veo3: { allowed: [4, 6, 8], multiShot: false },
  veo3_fast: { allowed: [4, 6, 8], multiShot: false },
  veo3_lite: { allowed: [4, 6, 8], multiShot: false },
  "kling-3.0/video": { min: 3, max: 15, multiShot: true },
  "bytedance/seedance-1.5-pro": { min: 4, max: 12, multiShot: false },
};

/** Veo's set, which is what the dispatcher falls back to for an unknown model. */
const FALLBACK: ModelLimits = { allowed: [4, 6, 8], multiShot: false };

export function limitsFor(model: string | null | undefined): ModelLimits {
  return (model !== null && model !== undefined ? LIMITS[model] : undefined) ?? FALLBACK;
}

export function maxSecondsFor(model: string | null | undefined): number {
  const limits = limitsFor(model);
  return limits.allowed !== undefined ? Math.max(...limits.allowed) : (limits.max ?? 8);
}

/** Whether this model can render the length the user asked for, as asked. */
export function supportsDuration(model: string | null | undefined, seconds: number): boolean {
  const limits = limitsFor(model);
  if (limits.allowed !== undefined) return limits.allowed.includes(seconds);
  return seconds >= (limits.min ?? 0) && seconds <= (limits.max ?? 0);
}

/**
 * How to describe the lengths this model offers, for a message to the user.
 *
 * Enumerated models read as a list because that is what they are; a model with
 * a range reads as a range, because telling someone Kling supports "3, 4, 5, 6,
 * 7, 8, 9, 10, 11, 12, 13, 14, 15" is technically true and useless.
 */
export function describeDurations(model: string | null | undefined): string {
  const limits = limitsFor(model);
  if (limits.allowed !== undefined) return `${limits.allowed.join(", ")} seconds`;
  return `${limits.min ?? 0} to ${limits.max ?? 0} seconds`;
}

/**
 * Whether this model can continue a clip it already made.
 *
 * Veo uses a dedicated extend endpoint. Every other video model gets a fresh
 * generation linked via `extended_from`, so the user can chain as many
 * continuations as they want (each costs a credit). Motion control is
 * excluded: it copies motion from footage, not from a prompt.
 */
export function canContinue(model: string | null | undefined): boolean {
  if (model === null || model === undefined) return false;
  if (model === "kling-3.0/motion-control") return false;
  return true;
}
