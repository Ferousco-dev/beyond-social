/**
 * What can be attached to a turn.
 *
 * On its own, and free of `server-only`, because both sides need it. The list
 * lived in `lib/chat/attachments`, which reads storage and is therefore server
 * only; the composer's schema needs the same names to parse a held turn back
 * out of the browser, and importing it from there pulled the whole server
 * module into the client bundle and failed the build.
 *
 * A plain constant with nothing behind it, so there is nothing to protect.
 */
export const ATTACHMENT_KINDS = ["photo", "audio"] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];
