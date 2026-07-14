import { type ReactNode } from "react";

import { type Message } from "@/lib/dashboard/conversations";

import { GeneratingDraft } from "./generating-draft";
import { VideoDraftCard } from "./video-draft-card";

export function MessageBubble({ message }: { message: Message }): ReactNode {
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
    <div className="text-ink">
      {message.content ? <p className="whitespace-pre-wrap leading-7">{message.content}</p> : null}
      {message.draft?.status === "generating" ? <GeneratingDraft /> : null}
      {message.draft?.status === "ready" ? <VideoDraftCard draft={message.draft} /> : null}
    </div>
  );
}
