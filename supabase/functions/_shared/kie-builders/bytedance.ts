import { type Builder } from "../kie-model-types.ts";

/**
 * Seedance 1.5 Pro.
 *
 * A fourth spelling of the same idea: `input_urls`, taking up to two images.
 * `aspect_ratio` is required here rather than optional, and the provider has no
 * `Auto`, so the house default stands in when the caller did not choose.
 */
export const seedance: Builder = (request) => ({
  prompt: request.prompt,
  duration: request.duration,
  aspect_ratio: request.aspectRatio === "Auto" ? "9:16" : request.aspectRatio,
  ...(request.imageUrls.length > 0 ? { input_urls: request.imageUrls.slice(0, 2) } : {}),
});
