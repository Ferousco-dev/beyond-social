import { type Route } from "next";
import { type ReactNode } from "react";

import { type ChatMessage } from "@/lib/chat/thread";

import { CopyButton } from "./copy-button";
import { GeneratingDraft } from "./generating-draft";
import { MessageAttachments } from "./message-attachments";
import { VideoDraftCard } from "./video-draft-card";

export function MessageBubble({
  message,
  editorHref,
  onCancelDraft,
  onRegenerate,
  regeneratingId,
}: {
  message: ChatMessage;
  editorHref: Route;
  onCancelDraft?: (generationId: string) => void;
  onRegenerate?: (generationId: string) => void;
  /** The draft currently being run again, if any. */
  regeneratingId?: string | null;
}): ReactNode {
  if (message.role === "user") {
    return (
      // Attachments sit above the bubble, aligned with it, so the turn reads in
      // the order it was composed: what was attached, then what was said.
      <div className="flex flex-col items-end gap-2">
        <MessageAttachments attachments={message.attachments} />
        {message.content ? (
          <div className="max-w-[80%] rounded-3xl bg-cloud px-4 py-2.5 text-ink">
            {message.content}
          </div>
        ) : null}
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
      {message.draft?.status === "generating" ? (
        <GeneratingDraft
          onCancel={
            onCancelDraft && message.draft.generationId
              ? () => onCancelDraft(message.draft?.generationId ?? "")
              : undefined
          }
        />
      ) : null}
      {message.draft?.status === "ready" ? (
        <VideoDraftCard
          draft={message.draft}
          editorHref={editorHref}
          onRegenerate={onRegenerate}
          regenerating={regeneratingId === message.draft.generationId}
        />
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
