/**
 * The identifier a user quotes in a support report.
 *
 * The digest is Next's own hash of a server error. It is all that survives to
 * the browser in production when the failure happened during render, and it is
 * enough to find the matching server log.
 */
export interface ErrorReference {
  readonly kind: "digest";
  readonly value: string;
}

/**
 * Returns nothing when there is no id, rather than inventing one. A reference
 * that does not appear in any log is worse than no reference: it sends whoever
 * receives it looking for something that was never written.
 */
export function errorReference(error: unknown): ErrorReference | null {
  if (error instanceof Error) {
    const { digest } = error as Error & { digest?: unknown };
    if (typeof digest === "string" && digest.length > 0) return { kind: "digest", value: digest };
  }

  return null;
}
