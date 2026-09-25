// What a failed render is allowed to say to the person who asked for it, and
// the one place that decides it, whether the failure came from the dispatch
// call itself, a callback, or a poll.
//
// This used to be dispatch-only, rewriting one kie reply ("Credits
// insufficient...", which is about the platform's account with kie, not the
// credits the user bought from us) and passing everything else through
// verbatim. Two things were wrong with that. First, a provider message we had
// not seen before went straight to the thread unfiltered, which is exactly
// what it should never do: kie's own wording can describe its internal state
// in terms a customer has no way to act on. Second, only the dispatch path
// went through it at all. `kie-callback`, which is where most failures
// actually arrive (a task that started and failed later, rather than one
// rejected at creation), wrote `body.msg` onto the row directly.
//
// Every failure now goes through `classifyFailure` before it is recorded or
// returned, dispatch and callback alike, and lands in one of a small set of
// categories rather than as free text. The category is stored alongside the
// message (`video_generations.error_code`, migration 0131) so a caller that
// wants to react differently to "try again" versus "fix your input" can, and
// so a log line says what kind of failure this was without parsing the
// sentence.
import { UnsupportedModelError } from "./kie-model-types.ts";

export type ErrorCategory =
  /** Our platform's account with the provider is out of funds. Not the user's. */
  | "insufficient_provider_credits"
  /** The user's own balance. Ordinarily caught by the gate before dispatch. */
  | "insufficient_credits"
  | "provider_unavailable"
  | "provider_rate_limited"
  | "invalid_input"
  | "unsupported_operation"
  | "generation_rejected"
  | "generation_failed"
  | "timeout"
  | "network_error"
  | "internal_error";

export interface NormalizedFailure {
  readonly category: ErrorCategory;
  /** Safe to show the person who asked for the render. */
  readonly message: string;
  /** True when trying the same request again, unmodified, might succeed. */
  readonly retryable: boolean;
}

/** kie's phrasing when the platform account has run dry. Matched loosely. */
const OUT_OF_FUNDS = /insufficient\s*credit|credits?\s*insufficient/i;
const RATE_LIMITED = /rate[- ]?limit|too many requests/i;
/** Validation wording worth repeating, since it is the one category where the
 * provider's own reason is what tells the caller what to fix. */
const VALIDATION = /required|invalid|must (be|contain|include|have)|missing|unsupported/i;

const OUT_OF_FUNDS_NOTICE =
  "Video generation is paused while we top up our render provider. Your credits were not spent, so this will work again shortly.";
const UNAVAILABLE_NOTICE = "Video generation is temporarily unavailable. Please try again shortly.";
const RATE_LIMITED_NOTICE =
  "Video generation is receiving more requests than usual right now. Please try again in a few minutes.";
const GENERIC_NOTICE = "That render could not be completed. Please try again.";

/** A message capped rather than truncated silently, so a log always shows what was cut. */
function capped(message: string, limit = 300): string {
  return message.length > limit ? `${message.slice(0, limit)}…` : message;
}

/**
 * Classifies a failure from what is actually known about it: an HTTP status,
 * when the failure came from our own fetch, and whatever message text the
 * provider or our own validation supplied.
 *
 * Never invents a reason kie did not give or a retry time it did not state. A
 * status or message this does not recognise falls to `generation_failed`
 * rather than a guess, which is the one category safe to be wrong about: it
 * says "this did not work", nothing more specific, and is not retried
 * automatically.
 */
export function classifyFailure(input: {
  readonly status?: number;
  readonly message?: string | null;
  readonly networkError?: boolean;
}): NormalizedFailure {
  const reported =
    typeof input.message === "string" && input.message.trim() !== "" ? input.message.trim() : null;

  if (input.networkError) {
    return { category: "network_error", message: UNAVAILABLE_NOTICE, retryable: true };
  }
  if (reported !== null && OUT_OF_FUNDS.test(reported)) {
    return { category: "insufficient_provider_credits", message: OUT_OF_FUNDS_NOTICE, retryable: true };
  }
  if (input.status === 429 || (reported !== null && RATE_LIMITED.test(reported))) {
    return { category: "provider_rate_limited", message: RATE_LIMITED_NOTICE, retryable: true };
  }
  if (input.status !== undefined && input.status >= 500) {
    return { category: "provider_unavailable", message: UNAVAILABLE_NOTICE, retryable: true };
  }
  if (input.status === 400 && reported !== null && VALIDATION.test(reported)) {
    // The one category where the provider's own wording travels: it is
    // actionable, and capped so a malformed response cannot dump an
    // unbounded string onto the row.
    return { category: "invalid_input", message: capped(reported), retryable: false };
  }
  if (input.status !== undefined && input.status >= 400 && input.status < 500) {
    return { category: "generation_rejected", message: GENERIC_NOTICE, retryable: false };
  }
  return { category: "generation_failed", message: GENERIC_NOTICE, retryable: false };
}

/** Thrown by a dispatch call so the category and the safe message travel with it. */
export class ProviderError extends Error {
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  constructor(failure: NormalizedFailure) {
    super(failure.message);
    this.name = "ProviderError";
    this.category = failure.category;
    this.retryable = failure.retryable;
  }
}

/**
 * Turns a provider rejection at dispatch time into the error that gets
 * recorded on the run.
 *
 * `action` names the call that failed, so a log line still says which
 * endpoint produced it even once the message shown to the user no longer
 * does.
 */
export function providerFailure(action: string, message: unknown, status: number): ProviderError {
  const reported = typeof message === "string" && message.trim() !== "" ? message.trim() : null;
  console.error("kie provider error", { action, message: reported, status });
  return new ProviderError(classifyFailure({ status, message: reported }));
}

/**
 * The category for whatever was actually thrown, for a catch block that has
 * no other way to know: `ProviderError` and `UnsupportedModelError` both
 * carry one, and everything else is ours, not the provider's, to have gone
 * wrong.
 */
export function categoryOf(error: unknown): ErrorCategory {
  if (error instanceof ProviderError) return error.category;
  if (error instanceof UnsupportedModelError) return "unsupported_operation";
  return "internal_error";
}
