import "server-only";

/**
 * What kind of video is being asked for, in the retriever's vocabulary.
 *
 * Every knowledge file carries an `applicability` block naming the platforms
 * and product types it applies to, and the ranker scores candidates on how much
 * of the request's context they match. Neither call site ever supplied that
 * context, so `contextMatch` returned a flat 0.5 for every chunk on every
 * request: the metadata was authored, stored, indexed, and never consulted.
 *
 * These are derived from signals the turn already produced rather than asked
 * for, because a form field asking someone to classify their own video before
 * they can make one is a worse product than a slightly weaker hint.
 */

/** Mirrors `PLATFORMS` in the engine's chunk schema. */
export type PlatformHint = "tiktok" | "youtube";

/** Mirrors `PRODUCT_TYPES` in the engine's chunk schema. */
export type ProductTypeHint = "short-form-video" | "product-video" | "ugc" | "talking-avatar";

/**
 * Aspect ratio is a real statement of intent: someone asking for 9:16 is making
 * a vertical short, and someone asking for 16:9 is not.
 *
 * `tiktok` stands for vertical short-form generally rather than that one app.
 * It is the tag the knowledge base uses most for that surface, and the files
 * that carry it also carry `instagram`, so the hint pulls the right material
 * either way. `Auto` yields nothing, because a request that did not choose a
 * shape has not told us anything.
 */
export function platformFromAspect(aspectRatio: string | null | undefined): PlatformHint | null {
  if (aspectRatio === "9:16") return "tiktok";
  if (aspectRatio === "16:9") return "youtube";
  return null;
}

/**
 * What the attachments say about the video.
 *
 * A photo classified as a person plus a voice clip is someone speaking, which
 * is a different craft from a product shot: different framing, different
 * pacing, different advice. That classification already happens at upload for
 * the likeness gate, so this reuses an answer rather than asking again.
 */
export function productTypeFromAttachments(options: {
  readonly hasPhoto: boolean;
  readonly hasAudio: boolean;
  readonly showsPerson: boolean;
}): ProductTypeHint {
  if (options.hasPhoto && options.showsPerson) {
    return options.hasAudio ? "talking-avatar" : "ugc";
  }
  if (options.hasPhoto) return "product-video";
  // No reference at all: the house default, and the tag the knowledge base
  // carries most.
  return "short-form-video";
}
