import { type Builder, UnsupportedModelError } from "../kie-model-types.ts";

/**
 * Gemini Omni Video.
 *
 * `duration` is a string here and an enumerated one: only "4", "6", "8" and
 * "10" are accepted, and it is required rather than optional. A number, or a
 * five, is rejected by the provider after the credit is held, so the requested
 * length is snapped to the nearest allowed value here instead.
 *
 * Stills go in `image_urls`, up to seven, and footage goes in `video_list` as
 * objects with a trim range rather than as bare urls. The two share one budget
 * of seven units, where a video counts as two, so the video is only sent when
 * the stills leave room for it.
 *
 * Every field is from docs.kie.ai/market/gemini-omni-video.
 */

const ALLOWED_SECONDS = [4, 6, 8, 10] as const;

/** The provider's own set, nearest match, preferring the shorter on a tie. */
function duration(requested: number): string {
  if (!Number.isFinite(requested)) return "8";
  const nearest = ALLOWED_SECONDS.reduce((best, value) =>
    Math.abs(value - requested) < Math.abs(best - requested) ? value : best,
  );
  return String(nearest);
}

/** The provider takes landscape or portrait only, with no square and no auto. */
function aspect(ratio: string): Record<string, string> {
  return ratio === "16:9" || ratio === "9:16" ? { aspect_ratio: ratio } : {};
}

export const geminiOmniVideo: Builder = (request) => {
  if (request.prompt === "") {
    throw new UnsupportedModelError(
      "gemini-omni-video",
      "it needs a description of the video to build",
    );
  }

  const images = request.imageUrls.slice(0, 7);
  /*
   * The quota is seven units, an image costs one and a video costs two, so
   * footage only rides along when two units are actually free. Sending it
   * anyway is a refusal the caller has already paid for.
   */
  const room = 7 - images.length;
  const [footage] = request.videoUrls;
  const video = footage !== undefined && room >= 2 ? footage : undefined;

  return {
    prompt: request.prompt,
    ...(images.length > 0 ? { image_urls: images } : {}),
    ...(video === undefined
      ? {}
      : // The provider trims rather than taking the whole file, and caps the
        // range at ten seconds.
        { video_list: [{ url: video, start: 0, ends: 10 }] }),
    duration: duration(request.duration),
    ...aspect(request.aspectRatio),
  };
};
