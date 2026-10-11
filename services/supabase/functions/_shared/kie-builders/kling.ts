import { type Builder, type MarketInput, UnsupportedModelError } from "../kie-model-types.ts";

/**
 * Kling 3.0.
 *
 * `duration` is a string of seconds ('3' to '15'), not a number, and
 * `aspect_ratio` has no `Auto`. The provider still requires a concrete ratio
 * for image-to-video requests, so `Auto` is normalized to the house default.
 *
 * Multi-shot is a different request, not an extra field. The provider takes a
 * list of beats in one call and cuts between them itself, which is why length
 * on this model should never route through clip stitching: `multi_shots` gives
 * a real cut where our own concatenation gives a seam. Two constraints come
 * with it, both from the provider's documentation: only a first frame is
 * honoured, where a single shot can take a first and a last, and `sound`
 * defaults on, so it is stated rather than left implicit.
 */
export const klingVideo: Builder = (request) => {
  // Annotated rather than inferred: without it each ternary branch contributes
  // its own optional keys, and a `key?: undefined` in the union does not
  // satisfy the index signature.
  const framing: MarketInput =
    request.imageUrls.length > 0
      ? // Multi-shot honours only the opening frame, so sending the pair we
        // would send for a single shot would quietly drop the second.
        {
          image_urls: request.shots.length > 0 ? request.imageUrls.slice(0, 1) : request.imageUrls,
          aspect_ratio: request.aspectRatio === "Auto" ? "9:16" : request.aspectRatio,
        }
      : { aspect_ratio: request.aspectRatio === "Auto" ? "9:16" : request.aspectRatio };

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
 * Kling Motion Control.
 *
 * The first model here that reads video: it copies the motion of the person in
 * `video_urls` onto the person in `input_urls`. Both are arrays of exactly one,
 * and both are required, which is why this was refused outright until the
 * request shape could carry footage.
 *
 * `character_orientation` and `background_source` are left at the provider's
 * defaults. Both are creative choices with sensible defaults, and inventing a
 * value here would quietly override a decision the caller never made.
 */
export const klingMotionControl: Builder = (request) => {
  if (request.videoUrls.length === 0) {
    throw new UnsupportedModelError(
      "kling-3.0/motion-control",
      "it copies motion from a reference video, and none was supplied",
    );
  }
  if (request.imageUrls.length === 0) {
    throw new UnsupportedModelError(
      "kling-3.0/motion-control",
      "it needs a photo of the person the motion is copied onto",
    );
  }
  return {
    ...(request.prompt === "" ? {} : { prompt: request.prompt }),
    input_urls: request.imageUrls.slice(0, 1),
    video_urls: request.videoUrls.slice(0, 1),
  };
};
