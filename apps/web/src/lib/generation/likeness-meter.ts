import "server-only";

import { costUsd, MODELS } from "@beyond-social/ai-gateway";
import { SharedRateLimiter } from "@beyond-social/rate-limit";

import { logger } from "@/lib/logger";
import { usageSink } from "@/lib/prompt-engine/providers";
import { supabaseRateLimitStore } from "@/lib/rate-limit-store";

/**
 * The abuse control and the bookkeeping around image classification.
 *
 * The classifier is a paid model call that any signed-in user can trigger by
 * re-attaching or re-saving an upload, and it had neither a limit nor a record.
 * That is a direct cost-amplification path: the loop costs the user one click
 * and costs us a model call each time, and nothing anywhere would have shown it
 * happening.
 *
 * Kept beside the classifier rather than inside it so the classifier stays one
 * thing: ask a model a question about an image.
 */

const CLASSIFIER_MODEL = "gemini-2.5-flash";

const limiter = new SharedRateLimiter({
  store: supabaseRateLimitStore(),
  onUnavailable: ({ error }) => {
    logger.error("image classification limit unavailable, skipping the model", { error });
  },
});

export type ClassifyPermission = "allowed" | "throttled" | "unavailable";

/**
 * Whether this user may spend another classification.
 *
 * Fails closed on the model call, like the gateway: an unreachable counter
 * means paid calls with nothing counting them, which is not a ceiling.
 *
 * Failing closed here does not mean failing the upload, and the distinction is
 * what keeps a cost control from becoming an outage. `unavailable` is reported
 * separately from `throttled` so the caller can skip the model and answer the
 * likeness question the safe way instead: no money spent, nobody blocked.
 */
export async function mayClassify(userId: string): Promise<ClassifyPermission> {
  const outcome = await limiter.check("imageClassification", userId);
  if (outcome.ok) return "allowed";
  return outcome.reason === "unavailable" ? "unavailable" : "throttled";
}

export interface ClassifierUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly ok: boolean;
  readonly error: string | null;
  readonly userId: string;
  readonly traceId: string | null;
}

/**
 * Files one classification against the same usage sink every gateway call uses,
 * so this spend appears in the same place as the rest and stops being invisible.
 *
 * Never throws: the accounting for a call is not worth failing the call over,
 * and this runs after the answer is already in hand.
 */
export async function recordClassifierUsage(usage: ClassifierUsage): Promise<void> {
  try {
    const spec = MODELS[CLASSIFIER_MODEL];
    if (!spec) {
      // Only reachable if the classifier is pointed at a model the catalogue
      // does not price, in which case there is no honest cost to record.
      logger.warn("classifier model is not in the catalogue", { model: CLASSIFIER_MODEL });
      return;
    }

    await usageSink.record({
      requestId: crypto.randomUUID(),
      task: "likeness-classification",
      model: CLASSIFIER_MODEL,
      provider: spec.provider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: costUsd(spec, usage.inputTokens, usage.outputTokens),
      latencyMs: usage.latencyMs,
      fallbacks: 0,
      attempts: 1,
      cached: false,
      ok: usage.ok,
      error: usage.error,
      userId: usage.userId,
      // No organisation is resolved on the upload path, so this is attributed
      // to the person rather than guessed at.
      orgId: null,
      traceId: usage.traceId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn("could not record classifier usage", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
