import { type ErrorCode } from "./codes";

/**
 * The house style for an error message, expressed as a type so it cannot be
 * half-followed.
 *
 * Three parts, always all three:
 *   title   what happened, in the user's terms and not the system's
 *   impact  whether anything was lost, stated rather than implied
 *   action  the one thing to do next
 *
 * "Something went wrong" answers none of the three, which is why it does not
 * appear anywhere below. If a new code cannot be given all three sentences
 * honestly, that is a sign the code is not distinct enough to exist.
 */
export interface ErrorCopy {
  readonly title: string;
  readonly impact: string;
  readonly action: string;
  /** Whether retrying the same thing is a sensible next step. */
  readonly retryable: boolean;
}

const COPY: Readonly<Record<ErrorCode, ErrorCopy>> = {
  network: {
    title: "We could not reach Beyond Social",
    impact: "Nothing was sent, so nothing was changed.",
    action: "Check your connection and try again.",
    retryable: true,
  },
  timeout: {
    title: "That took too long to finish",
    impact: "It may or may not have completed on our side, so check before repeating it.",
    action: "Reload the page to see the current state.",
    retryable: true,
  },
  rate_limited: {
    title: "Too many requests in a short time",
    impact: "The last request was refused. Nothing you had already done was affected.",
    action: "Wait about a minute, then try again.",
    retryable: true,
  },
  unauthorized: {
    title: "Your session has expired",
    impact: "Your work is saved. You were signed out, not removed.",
    action: "Sign in again to pick up where you left off.",
    retryable: false,
  },
  forbidden: {
    title: "This account cannot open that",
    impact: "Nothing was changed.",
    action: "Ask an owner of the workspace for access.",
    retryable: false,
  },
  not_found: {
    title: "That no longer exists",
    impact: "It was deleted or moved. Nothing else was affected.",
    action: "Go back and pick it from the list again.",
    retryable: false,
  },
  conflict: {
    title: "Someone else saved first",
    impact: "Your changes were not written, and theirs were kept.",
    action: "Reload to see the current version, then reapply your edit.",
    retryable: false,
  },
  validation: {
    title: "Some of that could not be accepted",
    impact: "Nothing was saved, so what you typed is still on screen.",
    action: "Fix the highlighted fields and submit again.",
    retryable: false,
  },
  unconfigured: {
    title: "This part of the product is not connected yet",
    impact: "Nothing was lost. The feature is unavailable, not broken.",
    action: "Try again once it is set up, or contact support if you expected access.",
    retryable: false,
  },
  server: {
    title: "We hit an error on our side",
    impact: "Your saved work is intact. The last action did not complete.",
    action: "Try again in a moment. If it keeps happening, send us the reference below.",
    retryable: true,
  },
  unknown: {
    title: "This did not finish",
    impact: "We cannot tell whether it went through, so check before repeating it.",
    action: "Reload the page, and send us the reference below if it happens again.",
    retryable: true,
  },
};

export function errorCopy(code: ErrorCode): ErrorCopy {
  return COPY[code];
}

/**
 * The single-line form, for a toast or an inline field where three lines do not
 * fit. Impact and action still both appear: dropping them is what turns a
 * useful message back into "something went wrong".
 */
export function errorLine(code: ErrorCode): string {
  const { title, action } = COPY[code];
  return `${title}. ${action}`;
}
