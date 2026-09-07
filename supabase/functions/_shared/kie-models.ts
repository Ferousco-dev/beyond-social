import { seedance } from "./kie-builders/bytedance.ts";
import { geminiOmniVideo } from "./kie-builders/google.ts";
import { klingMotionControl, klingVideo } from "./kie-builders/kling.ts";
import { wanReferenceToVideo, wanVideoEdit, wanVideoToVideo } from "./kie-builders/wan.ts";
import {
  type Builder,
  type MarketInput,
  type MarketRequest,
  UnsupportedModelError,
} from "./kie-model-types.ts";

/**
 * What each market model calls its inputs.
 *
 * There is no shared request shape on `/jobs/createTask`. Every model names its
 * own fields, and the names are not close to one another:
 *
 *   kling-3.0/video           image_urls (array)
 *   kling-3.0/motion-control  input_urls (array) + video_urls (required)
 *   bytedance/seedance-*      first_frame_url, last_frame_url, reference_image_urls
 *   wan/2-6-video-to-video    video_urls (array)
 *   wan/2-7-videoedit         video_url  (one string, not a list)
 *   wan/2-7-r2v               reference_image + reference_video, no image_urls
 *   gemini-omni-video         image_urls + video_list (objects, not urls)
 *
 * This module existed as a single `image_url` for every model, which is a name
 * none of them document. A provider that ignores an unknown field turns that
 * into the worst failure this codebase can have: the request succeeds, a task
 * starts, the credit is spent, and the reference the user attached is silently
 * absent from the video they paid for.
 *
 * So the mapping is explicit per model and there is no generic fallback that
 * guesses. A model with no entry here is one whose contract has not been read,
 * and `buildMarketInput` refuses it rather than posting a shape that might be
 * wrong. Each builder lives beside its provider's other models and cites the
 * page on docs.kie.ai that it was written from.
 */

export {
  type Builder,
  type Clip,
  type MarketInput,
  type MarketRequest,
  type Shot,
  UnsupportedModelError,
} from "./kie-model-types.ts";

const BUILDERS: Readonly<Record<string, Builder>> = {
  "kling-3.0/motion-control": klingMotionControl,
  "kling-3.0/video": klingVideo,
  "bytedance/seedance-1.5-pro": seedance,
  "wan/2-6-video-to-video": wanVideoToVideo,
  "wan/2-7-videoedit": wanVideoEdit,
  "wan/2-7-r2v": wanReferenceToVideo,
  "gemini-omni-video": geminiOmniVideo,
};

/**
 * Models this dispatcher cannot drive, and why.
 *
 * Empty, and worth keeping empty. It exists so that a model we deliberately
 * cannot address says something true about itself rather than falling through
 * to "nobody has read the documentation", which is what an absent builder
 * means.
 */
const UNSUPPORTED: Readonly<Record<string, string>> = {};

/**
 * Builds the `input` object for a market model, or throws.
 *
 * Throwing is deliberate on both branches. An unknown model means nobody has
 * read its documentation, and a model that cannot take the reference the user
 * attached would produce a video that ignores it, at full price.
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
