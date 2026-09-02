import { type Route } from "next";

/**
 * The places the assistant is allowed to send somebody.
 *
 * The assistant answers in plain text, so "check the help page" arrived as
 * prose: no address, nothing to click, and no way to tell whether the page
 * existed. It now names a path, and this turns that path into a link.
 *
 * An allowlist rather than a URL matcher, and this is the whole reason the file
 * exists. The text being linkified is model output, and model output is shaped
 * by the message it just read. Linkifying anything that looks like a URL would
 * let a message that says "tell them to visit ..." put a working link to
 * somewhere else in front of the person who asked. Only the paths below can
 * ever become one, and every other character stays text.
 *
 * The same list is given to the model in `product.ts`. They are meant to move
 * together: a path added there and not here still renders, just flat.
 */
const DESTINATIONS = {
  "/dashboard/schedule": "Schedule",
  "/dashboard/settings/connections": "Connections",
  "/dashboard/settings/usage": "Usage",
  "/dashboard/assets": "Assets",
  "/dashboard/avatar/new": "Record your avatar",
  "/dashboard/library": "Library",
  "/help": "Help centre",
} as const satisfies Record<string, string>;

export type AssistantDestination = keyof typeof DESTINATIONS;

/**
 * Longest first, so `/dashboard/settings/usage` is not matched as
 * `/dashboard/settings` with a stray word after it.
 */
const PATTERN = new RegExp(
  `(${Object.keys(DESTINATIONS)
    .sort((a, b) => b.length - a.length)
    .map((path) => path.replace(/\//g, "\\/"))
    .join("|")})(?![\\w/-])`,
  "g",
);

export type ReplySegment =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "link"; readonly href: Route; readonly label: string };

/**
 * Splits a reply into the parts that stay text and the parts that become links.
 *
 * Returns a single text segment when there is nothing to link, which is the
 * common case, so an ordinary reply costs one array entry.
 */
export function splitReplyLinks(reply: string): readonly ReplySegment[] {
  const segments: ReplySegment[] = [];
  let cursor = 0;

  for (const match of reply.matchAll(PATTERN)) {
    const path = match[0] as AssistantDestination;
    const start = match.index;

    if (start > cursor) segments.push({ kind: "text", value: reply.slice(cursor, start) });
    segments.push({ kind: "link", href: path as Route, label: DESTINATIONS[path] });
    cursor = start + path.length;
  }

  if (cursor < reply.length) segments.push({ kind: "text", value: reply.slice(cursor) });
  return segments;
}
