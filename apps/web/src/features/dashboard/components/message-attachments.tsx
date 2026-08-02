import { type ReactNode } from "react";

import { type Attachment } from "@/lib/chat/attachments";

/**
 * What the user attached to a turn, shown above their message.
 *
 * Photos are deliberately plain `img` rather than `next/image`: the source is a
 * signed URL into a private bucket that changes on every read, so the image
 * optimiser would cache under a key that is never hit twice and proxy every
 * byte for nothing.
 */

function PhotoAttachment({ url }: { url: string }): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      // The photo is context for the message beside it, not content of its own,
      // and inventing a description of a picture nobody has described would be
      // worse than leaving it to the message. Announced by the group label.
      alt=""
      loading="lazy"
      className="size-20 rounded-xl border border-hairline object-cover"
    />
  );
}

function AudioAttachment({ url }: { url: string }): ReactNode {
  return (
    <audio
      controls
      preload="none"
      src={url}
      className="h-9 w-56 max-w-full"
      aria-label="Voice clip attached to this message"
    />
  );
}

export function MessageAttachments({
  attachments,
}: {
  attachments: readonly Attachment[];
}): ReactNode {
  if (attachments.length === 0) return null;

  // An attachment whose link could not be signed is dropped rather than
  // rendered as a broken frame. The count below still reports it, so the turn
  // does not silently look like it carried less than it did.
  const usable = attachments.filter(
    (attachment): attachment is Attachment & { url: string } => attachment.url !== null,
  );
  const unavailable = attachments.length - usable.length;

  return (
    <ul
      className="flex flex-wrap justify-end gap-2"
      aria-label={`${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`}
    >
      {usable.map((attachment) => (
        <li key={attachment.path}>
          {attachment.kind === "audio" ? (
            <AudioAttachment url={attachment.url} />
          ) : (
            <PhotoAttachment url={attachment.url} />
          )}
        </li>
      ))}
      {unavailable > 0 ? (
        <li className="self-center text-xs text-ink-soft">
          {unavailable} attachment{unavailable === 1 ? "" : "s"} could not be loaded
        </li>
      ) : null}
    </ul>
  );
}
