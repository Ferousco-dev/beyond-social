import { type MarketInput, UnsupportedModelError } from "../kie-model-types.ts";

import { infinitalk } from "./infinitalk.ts";
import { klingAvatar } from "./kling.ts";
import { omnihuman } from "./omnihuman.ts";
import { type AvatarRequest } from "./types.ts";

export { type AvatarRequest };

/**
 * The avatar dispatcher, per model rather than one shape for all.
 *
 * `generate-avatar` used to send one payload to every avatar model
 * (`image_url`, `audio_url`, `prompt`, `resolution`). That was correct for
 * three of them and silently wrong for omnihuman, which spells the field
 * `output_resolution` and its values without a `p`. Adding a model to the
 * catalogue then meant hoping its schema was close enough, which is the
 * failure mode `kie-models.ts` was rebuilt to remove.
 *
 * Every builder lives beside its provider's other models and cites the page on
 * docs.kie.ai that it was written from.
 */

// One builder covers both kling avatar tiers because the request is the same;
// the price difference lives in the catalogue row rather than the payload.
const BUILDERS: Readonly<Record<string, (request: AvatarRequest) => MarketInput>> = {
  "kling/ai-avatar-standard": klingAvatar,
  "kling/ai-avatar-pro": klingAvatar,
  "infinitalk/from-audio": infinitalk,
  "omnihuman-1-5": omnihuman,
};

/**
 * Models this dispatcher deliberately does not drive, and why.
 *
 * `volcengine/video-to-video-lip-sync` takes footage as its `video_url` rather
 * than a still photo, and swaps in new audio to re-lip the speaker. It is a
 * different job kind, not a variation on this one, and the composer does not
 * currently express a request that carries both a video and an audio to the
 * same model. Activating it against this avatar path would send an image to a
 * field it never reads.
 */
const UNSUPPORTED: Readonly<Record<string, string>> = {
  "volcengine/video-to-video-lip-sync":
    "it takes footage and audio to re-lip a video, not a still image; needs its own composer path",
};

export function buildAvatarInput(model: string, request: AvatarRequest): MarketInput {
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

/** True when this dispatcher can drive the model, so the caller does not have to catch. */
export function isAvatarModelSupported(model: string): boolean {
  return model in BUILDERS && !(model in UNSUPPORTED);
}

// Re-export so callers only import from one place.
export { type MarketInput, UnsupportedModelError };
