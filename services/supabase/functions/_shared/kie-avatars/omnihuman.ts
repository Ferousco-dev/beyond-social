import { type MarketInput } from "../kie-model-types.ts";

import { type AvatarRequest } from "./types.ts";

/**
 * omnihuman-1-5.
 *
 * Where every other avatar model calls the field `resolution`, this one calls
 * it `output_resolution`, and where every other one spells the values with a
 * `p` (`"720p"`, `"1080p"`), this one takes them without (`"720"`, `"1080"`).
 * A request with the wrong spelling is accepted and quietly falls back to the
 * default, and the caller pays for a resolution they did not ask for.
 *
 * 480 is not an option, so a request for it is raised to 720 rather than sent
 * and dropped. 1080 is the provider's default and stays default when the
 * caller did not choose either.
 */
export const omnihuman = (request: AvatarRequest): MarketInput => {
  const output_resolution =
    request.resolution === "480p" || request.resolution === "720p" ? "720" : "1080";
  return {
    image_url: request.imageUrl,
    audio_url: request.audioUrl,
    ...(request.prompt === "" ? {} : { prompt: request.prompt }),
    output_resolution,
  };
};
