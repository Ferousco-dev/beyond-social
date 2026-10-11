import "server-only";

import { getEmbedder } from "@/lib/prompt-engine/providers";

/**
 * One sentence, embedded at most once, and only if somebody needs it.
 *
 * A turn asks two questions of the same message: what is this person like, and
 * what were they working on. Both are vector searches over the same sentence,
 * so each was embedding it separately: two calls for one identical vector.
 * Handing them a shared promise fixed that but created the opposite problem,
 * because the caller then had to embed eagerly to have something to share, and
 * an embedding is the most expensive thing in the turn: about 600ms warm and
 * 2.3 seconds on a cold instance, where the first connection to the embedder
 * is a new one.
 *
 * Most turns do not need it. A vector search only earns its cost when there is
 * enough stored to have to choose between; somebody with four memories is
 * getting all four whatever the ranking says. So the readers decide, and this
 * is what lets them: nobody asks, nothing is embedded, and if both ask, it
 * happens once.
 *
 * A failure resolves to undefined rather than rejecting. Every caller can fall
 * back to a cheaper answer, and a recall that fails should cost the ranking
 * rather than the turn.
 */
export type LazyEmbedding = () => Promise<readonly number[] | undefined>;

export function embedOnce(text: string): LazyEmbedding {
  let started: Promise<readonly number[] | undefined> | null = null;

  return () => {
    started ??= getEmbedder()
      .embed([text])
      .then(([vector]) => vector)
      .catch(() => undefined);
    return started;
  };
}
