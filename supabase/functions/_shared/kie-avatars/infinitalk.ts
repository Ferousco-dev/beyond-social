import { type MarketInput } from "../kie-model-types.ts";

import { type AvatarRequest } from "./types.ts";

/**
 * infinitalk/from-audio.
 *
 * Takes an image, an audio track, a prompt and a resolution. "480p" is the
 * documented default, "720p" is four times the cost, and the model does not
 * accept "1080p" at all, so a taller request is snapped down.
 */
export const infinitalk = (request: AvatarRequest): MarketInput => ({
  image_url: request.imageUrl,
  audio_url: request.audioUrl,
  prompt: request.prompt,
  resolution: request.resolution === "720p" ? "720p" : "480p",
});
