import { type AttachmentKind } from "@/lib/chat/attachments";

/**
 * One thing the user sent, resolved for display.
 *
 * Carries the project it belongs to rather than only the message, because the
 * library exists to get you back to the conversation: the thread is the
 * destination, and a message id would only name a scroll position in it.
 */
export interface LibraryItem {
  readonly id: string;
  readonly kind: AttachmentKind;
  readonly path: string;
  /** Null when the object could not be signed, so the card can say so. */
  readonly url: string | null;
  readonly projectId: string;
  readonly projectTitle: string;
  /** ISO 8601. Formatted in the browser so it reads in the viewer's locale. */
  readonly createdAt: string;
}
