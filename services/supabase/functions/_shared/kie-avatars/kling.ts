import { type MarketInput } from "../kie-model-types.ts";

import { type AvatarRequest } from "./types.ts";

/**
 * kling/ai-avatar-standard and kling/ai-avatar-pro.
 *
 * Both take exactly the same three fields (`image_url`, `audio_url`, `prompt`)
 * and neither takes a resolution field: the tier decides it. Standard renders
 * at 720p and Pro at 1080p, which is what the catalogue's price difference is
 * paying for. Sending `resolution` here would be ignored, which is fine, but it
 * is left off deliberately so the shape stays identical to what the
 * documentation shows.
 */
export const klingAvatar = (request: AvatarRequest): MarketInput => ({
  image_url: request.imageUrl,
  audio_url: request.audioUrl,
  prompt: request.prompt,
});
