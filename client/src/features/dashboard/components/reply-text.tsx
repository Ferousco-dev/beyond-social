import Link from "next/link";
import { type ReactNode } from "react";

import { splitReplyLinks } from "@/lib/chat/links";

/**
 * A reply, with the places it names made reachable.
 *
 * The assistant writes paths as plain text and this renders them as the name of
 * the page rather than the address: "you can do that yourself on Schedule"
 * reads as a sentence, where "/dashboard/schedule" reads as a stack trace.
 *
 * Underlined rather than only coloured, because a link inside a paragraph of
 * body text is not distinguishable by colour alone.
 */
export function ReplyText({ reply }: { reply: string }): ReactNode {
  return (
    <p className="whitespace-pre-wrap leading-7">
      {splitReplyLinks(reply).map((segment, index) =>
        segment.kind === "text" ? (
          segment.value
        ) : (
          <Link
            key={index}
            href={segment.href}
            className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {segment.label}
          </Link>
        ),
      )}
    </p>
  );
}
