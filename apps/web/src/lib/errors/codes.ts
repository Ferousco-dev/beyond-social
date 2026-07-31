import { z } from "zod";

/**
 * The failure kinds the product actually distinguishes in front of a user.
 *
 * Deliberately short. Every extra code has to earn a distinct sentence of copy,
 * and a code that reads the same to a user as another one is just a second name
 * for the same problem.
 */
export const errorCodeSchema = z.enum([
  "network",
  "timeout",
  "rate_limited",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "validation",
  "unconfigured",
  "server",
  "unknown",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * Maps the `error` field the API envelope actually sends onto a code.
 *
 * The wire names are the API's contract and are not going to be renamed to suit
 * the UI, so the translation lives here rather than leaking either vocabulary
 * into the other.
 */
const WIRE_CODES: Readonly<Record<string, ErrorCode>> = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  rate_limited: "rate_limited",
  invalid_request: "validation",
  not_found: "not_found",
  conflict: "conflict",
  unconfigured: "unconfigured",
  not_configured: "unconfigured",
  unavailable: "unconfigured",
  internal_error: "server",
  server_error: "server",
};

export function codeFromWire(wire: string): ErrorCode {
  return WIRE_CODES[wire] ?? "unknown";
}

/** HTTP status is the fallback when a response carries no envelope at all. */
export function codeFromStatus(status: number): ErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "server";
  return "unknown";
}
