/**
 * What every market model builder is given, and what it must return.
 *
 * Separate from the registry so the builders can import these without the
 * registry importing them back. A cycle here would be invisible until Deno
 * resolved it at runtime, in the middle of a dispatch.
 */

/** One beat of a multi-shot run. */
export interface Shot {
  readonly prompt: string;
  readonly duration: number;
}

/** What the dispatcher knows, before any model's naming is applied. */
export interface MarketRequest {
  readonly prompt: string;
  /** Provider-reachable URLs. Empty when the run has no reference still. */
  readonly imageUrls: readonly string[];
  /**
   * Footage to work from, for models that edit or copy motion from video
   * rather than generating it from nothing. Empty for every other request.
   */
  readonly videoUrls: readonly string[];
  /** "9:16" | "16:9" | "Auto". `Auto` means the caller did not choose. */
  readonly aspectRatio: string;
  readonly duration: number;
  /**
   * The shot list, when the caller asked for one and the model can take it.
   * Empty means a single shot, which is not the same request: the provider
   * reads `prompt` in that case and ignores the list entirely.
   */
  readonly shots: readonly Shot[];
}

/**
 * A piece of footage with the range to take from it.
 *
 * Gemini reads video this way rather than as a bare url, because it trims
 * rather than consuming the whole file.
 */
export interface Clip {
  readonly url: string;
  readonly start: number;
  readonly ends: number;
}

export type MarketInput = Record<
  string,
  string | number | boolean | readonly string[] | readonly Shot[] | readonly Clip[]
>;

export type Builder = (request: MarketRequest) => MarketInput;

/**
 * Thrown before dispatch, so nothing is charged.
 *
 * Refusing is the point: a model we cannot address correctly must not be sent a
 * request we invented, because the user pays for the result either way.
 */
export class UnsupportedModelError extends Error {
  constructor(model: string, reason: string) {
    super(`${model} cannot be dispatched: ${reason}`);
    this.name = "UnsupportedModelError";
  }
}
