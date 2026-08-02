/**
 * What the library can hold.
 *
 * A superset of `AttachmentKind`, which covers only what a message carried.
 * A finished render is not an attachment: it lives in a different table and a
 * different bucket, and it is the one thing here the user did not send but
 * made. It belongs in the same grid all the same, because the question people
 * actually ask is "where is that video", not "which table was it in".
 */
export const LIBRARY_KINDS = ["photo", "audio", "video"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

/**
 * One thing in the library, resolved for display.
 *
 * Carries the project it belongs to rather than only the row it came from,
 * because the library exists to get you back to the conversation: the thread is
 * the destination, and a message id would only name a scroll position in it.
 */
export interface LibraryItem {
  readonly id: string;
  readonly kind: LibraryKind;
  readonly path: string;
  /** Null when the object could not be signed, so the card can say so. */
  readonly url: string | null;
  readonly projectId: string;
  readonly projectTitle: string;
  /** ISO 8601. Formatted in the browser so it reads in the viewer's locale. */
  readonly createdAt: string;
}
