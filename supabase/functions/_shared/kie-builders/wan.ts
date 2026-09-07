import { type Builder, UnsupportedModelError } from "../kie-model-types.ts";

/**
 * The Wan family, which names the same idea three different ways.
 *
 * Restyle takes `video_urls`, an array. Video edit takes `video_url`, a single
 * string. Reference to video takes neither, and wants `reference_image` and
 * `reference_video` instead. Those are not variations on a convention, they are
 * three separate contracts, and a request built for the wrong one is accepted,
 * charged, and silently ignores the footage it was given.
 *
 * Every field below is from each model's own page on docs.kie.ai. Nothing here
 * is inferred from a sibling.
 */

/** Both 2.7 models take seconds as a number, clamped to what they accept. */
function seconds(requested: number, min: number, max: number): number {
  if (!Number.isFinite(requested)) return 5;
  return Math.min(Math.max(Math.round(requested), min), max);
}

/**
 * Wan 2.6, video to video.
 *
 * Restyles footage from a prompt. `duration` is a string of seconds and the
 * provider only takes "5" or "10", so a request for anything else is snapped to
 * the nearer of the two rather than refused: the caller wants their footage
 * restyled, and a length they did not ask for beats no video at all.
 */
export const wanVideoToVideo: Builder = (request) => {
  if (request.videoUrls.length === 0) {
    throw new UnsupportedModelError(
      "wan/2-6-video-to-video",
      "it restyles an existing video, and none was supplied",
    );
  }
  if (request.prompt === "") {
    throw new UnsupportedModelError(
      "wan/2-6-video-to-video",
      "it needs a description of what to restyle the footage into",
    );
  }

  return {
    prompt: request.prompt,
    // Three are allowed. One is what the composer can attach.
    video_urls: request.videoUrls.slice(0, 1),
    duration: request.duration >= 8 ? "10" : "5",
  };
};

/**
 * Wan 2.7, video edit.
 *
 * The one model here that takes a single video rather than a list, and a single
 * reference image rather than a list. `duration` 0 keeps the source length,
 * which is the right default for an edit: the caller asked for a change to
 * their footage, not for a different length of it.
 */
export const wanVideoEdit: Builder = (request) => {
  const [video] = request.videoUrls;
  if (video === undefined) {
    throw new UnsupportedModelError(
      "wan/2-7-videoedit",
      "it edits an existing video, and none was supplied",
    );
  }

  const [reference] = request.imageUrls;
  return {
    video_url: video,
    ...(request.prompt === "" ? {} : { prompt: request.prompt }),
    ...(reference === undefined ? {} : { reference_image: reference }),
    ...(request.aspectRatio === "Auto" ? {} : { aspect_ratio: request.aspectRatio }),
    duration: 0,
  };
};

/**
 * Wan 2.7, reference to video.
 *
 * Builds a new video from references while holding the subject steady, so it
 * takes stills and footage as separate lists rather than as one. At least one
 * of the two is required and together they cap at five, which is enforced here
 * rather than left to the provider: exceeding it fails after the credit is
 * spent.
 */
export const wanReferenceToVideo: Builder = (request) => {
  const images = request.imageUrls.slice(0, 5);
  const videos = request.videoUrls.slice(0, Math.max(0, 5 - images.length));

  if (images.length === 0 && videos.length === 0) {
    throw new UnsupportedModelError(
      "wan/2-7-r2v",
      "it builds from reference stills or footage, and neither was supplied",
    );
  }
  if (request.prompt === "") {
    throw new UnsupportedModelError(
      "wan/2-7-r2v",
      "it needs a description of what to build from the references",
    );
  }

  return {
    prompt: request.prompt,
    ...(images.length > 0 ? { reference_image: images } : {}),
    ...(videos.length > 0 ? { reference_video: videos } : {}),
    ...(request.aspectRatio === "Auto" ? {} : { aspect_ratio: request.aspectRatio }),
    duration: seconds(request.duration, 2, 10),
  };
};
