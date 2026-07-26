import { type Route } from "next";
import { type ReactNode } from "react";

import { type ChatMessage } from "@/lib/chat/thread";

import { CopyButton } from "./copy-button";
import { GeneratingDraft } from "./generating-draft";
import { VideoDraftCard } from "./video-draft-card";

export function MessageBubble({
  message,
  editorHref,
}: {
  message: ChatMessage;
  editorHref: Route;
}): ReactNode {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl bg-cloud px-4 py-2.5 text-ink">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group/message text-ink">
      {message.content ? (
        <>
          <p className="whitespace-pre-wrap leading-7">{message.content}</p>
          {/* Revealed on hover so the thread stays quiet while reading. */}
          <div className="mt-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100">
            <CopyButton value={message.content} label="Copy reply" />
          </div>
        </>
      ) : null}
      {message.draft?.status === "generating" ? <GeneratingDraft /> : null}
      {message.draft?.status === "ready" ? (
        <VideoDraftCard draft={message.draft} editorHref={editorHref} />
      ) : null}
      {/* A failed draft says so. It used to be indistinguishable from a reply
          with no video, which read as though nothing had been attempted. */}
      {message.draft?.status === "failed" ? (
        <p className="mt-3 rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-soft">
          This draft did not finish rendering. Send the message again to retry.
        </p>
      ) : null}
    </div>
  );
}
