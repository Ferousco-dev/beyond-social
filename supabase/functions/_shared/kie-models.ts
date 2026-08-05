/**
 * What each market model calls its inputs.
 *
 * There is no shared request shape on `/jobs/createTask`. Every model names its
 * own fields, and the names are not close to one another:
 *
 *   kling-3.0/video           image_urls (array)
 *   kling-3.0/motion-control  input_urls (array) + video_urls (required)
 *   bytedance/seedance-*      first_frame_url, last_frame_url, reference_image_urls
 *
 * This module existed as a single `image_url` for every model, which is a name
 * none of them document. A provider that ignores an unknown field turns that
 * into the worst failure this codebase can have: the request succeeds, a task
 * starts, the credit is spent, and the reference photo the user attached is
 * silently absent from the video they paid for.
 *
 * So the mapping is explicit per model and there is no generic fallback that
 * guesses. A model with no entry here is one whose contract has not been read,
 * and `buildMarketInput` refuses it rather than posting a shape that might be
 * wrong.
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

export type MarketInput = Record<
  string,
  string | number | boolean | readonly string[] | readonly Shot[]
>;

type Builder = (request: MarketRequest) => MarketInput;

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

/**
 * Kling 3.0.
 *
 * `duration` is a string of seconds ('3' to '15'), not a number, and
 * `aspect_ratio` has no `Auto`. Kling adapts the ratio to the images when they
 * are supplied, so the field is omitted in that case rather than fighting them.
 *
 * Multi-shot is a different request, not an extra field. The provider takes a
 * list of beats in one call and cuts between them itself, which is why length
 * on this model should never route through clip stitching: `multi_shots` gives
 * a real cut where our own concatenation gives a seam. Two constraints come
 * with it, both from the provider's documentation: only a first frame is
 * honoured, where a single shot can take a first and a last, and `sound`
 * defaults on, so it is stated rather than left implicit.
 */
const klingVideo: Builder = (request) => {
  // Annotated rather than inferred: without it each ternary branch contributes
  // its own optional keys, and a `key?: undefined` in the union does not
  // satisfy the index signature.
  const framing: MarketInput =
    request.imageUrls.length > 0
      ? // Multi-shot honours only the opening frame, so sending the pair we
        // would send for a single shot would quietly drop the second.
        { image_urls: request.shots.length > 0 ? request.imageUrls.slice(0, 1) : request.imageUrls }
      : request.aspectRatio === "Auto"
        ? {}
        : { aspect_ratio: request.aspectRatio };

  if (request.shots.length === 0) {
    return { prompt: request.prompt, duration: String(request.duration), ...framing };
  }

  return {
    // `duration` stays the total the shots add up to; the provider reads the
    // per-shot lengths from the list.
    duration: String(request.shots.reduce((total, shot) => total + shot.duration, 0)),
    multi_shots: true,
    multi_prompt: request.shots,
    sound: true,
    ...framing,
  };
};

/**
 * Seedance 1.5 Pro.
 *
 * A fourth spelling of the same idea: `input_urls`, taking up to two images.
 * `aspect_ratio` is required here rather than optional, and the provider has no
 * `Auto`, so the house default stands in when the caller did not choose.
 */
const seedance: Builder = (request) => ({
  prompt: request.prompt,
  duration: request.duration,
  aspect_ratio: request.aspectRatio === "Auto" ? "9:16" : request.aspectRatio,
  ...(request.imageUrls.length > 0 ? { input_urls: request.imageUrls.slice(0, 2) } : {}),
});

const BUILDERS: Readonly<Record<string, Builder>> = {
  "kling-3.0/video": klingVideo,
  "bytedance/seedance-1.5-pro": seedance,
};

/**
 * Models this dispatcher cannot drive, and why.
 *
 * Separate from "not in the catalogue" so the error says something true. Motion
 * control is the live case: it is active and priced, but it needs a reference
 * video (`video_urls`) to copy motion from, and nothing in the request shape
 * carries one. Offering it would take the credit and fail at the provider.
 */
const UNSUPPORTED: Readonly<Record<string, string>> = {
  "kling-3.0/motion-control":
    "it requires a reference video to copy motion from, which this endpoint cannot yet accept",
};

/**
 * Builds the `input` object for a market model, or throws.
 *
 * Throwing is deliberate on both branches. An unknown model means nobody has
 * read its documentation, and a model that cannot take the reference image the
 * user attached would produce a video that ignores it, at full price.
 */
export function buildMarketInput(model: string, request: MarketRequest): MarketInput {
  const unsupported = UNSUPPORTED[model];
  if (unsupported !== undefined) throw new UnsupportedModelError(model, unsupported);

  const build = BUILDERS[model];
  if (build === undefined) {
    throw new UnsupportedModelError(
      model,
      "its request shape is not known, and guessing a field name would drop the input silently",
    );
  }

  return build(request);
}
