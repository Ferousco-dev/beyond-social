import { type Route } from "next";
import { type ReactNode } from "react";

import { type ChatMessage } from "@/lib/chat/thread";

import { CopyButton } from "./copy-button";
import { GeneratingDraft } from "./generating-draft";
import { MessageAttachments } from "./message-attachments";
import { ReplyText } from "./reply-text";
import { VideoDraftCard } from "./video-draft-card";

export function MessageBubble({
  message,
  editorHref,
  onCancelDraft,
  onRegenerate,
  onExtend,
  regeneratingId,
}: {
  message: ChatMessage;
  editorHref: Route;
  onCancelDraft?: (generationId: string) => void;
  onRegenerate?: (generationId: string) => void;
  onExtend?: (generationId: string) => void;
  /** The draft currently being run again, if any. */
  regeneratingId?: string | null;
}): ReactNode {
  if (message.role === "user") {
    return (
      // A request, not a chat bubble: a quiet label above the result it
      // produced, not a filled shape claiming its own side of the screen. This
      // is a workbench, one thread of requests and their results, not a
      // conversation between two speakers.
      <div className="flex flex-col gap-2">
        <MessageAttachments attachments={message.attachments} />
        {message.content ? (
          <p className="text-sm font-medium text-ink-soft">{message.content}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="group/message text-ink">
      {message.content ? (
        <>
          <ReplyText reply={message.content} />
          {/* Revealed on hover so the thread stays quiet while reading, and shown
              outright where there is no hover, because otherwise a phone has no way
              to copy a reply. */}
          <div className="mt-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100">
            <CopyButton value={message.content} label="Copy reply" />
          </div>
        </>
      ) : null}
      {message.draft?.status === "generating" ? (
        <GeneratingDraft
          startedAt={message.draft.startedAt}
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
          onExtend={onExtend}
          regenerating={regeneratingId === message.draft.generationId}
        />
      ) : null}
      {/* A failed draft says so, and says why when the reason was recorded. It
          used to be indistinguishable from a reply with no video, which read as
          though nothing had been attempted. */}
      {message.draft?.status === "failed" ? (
        <div className="mt-3 rounded-xl border border-hairline bg-paper px-3 py-2 text-xs">
          {/* The reason leads, because it is the part that answers the
              question. Absent on rows that failed before anything wrote one. */}
          {message.draft.error?.trim() ? (
            <p className="text-ink">{message.draft.error.trim()}</p>
          ) : null}
          <p className="mt-1 text-ink-soft first:mt-0">
            This draft did not finish rendering. Send the message again to retry.
          </p>
        </div>
      ) : null}
    </div>
  );
}
