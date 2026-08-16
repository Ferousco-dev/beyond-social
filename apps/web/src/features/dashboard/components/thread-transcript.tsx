"use client";

import { type Route } from "next";

import { type ChatMessage } from "@/lib/chat/thread";
import { type FollowUp } from "@/lib/generation/follow-ups";
import { type TurnStage } from "@/lib/chat/turn";
import { cn } from "@/lib/utils";

import { FollowUpChips } from "./follow-up-chips";
import { MessageBubble } from "./message-bubble";
import { ThinkingIndicator } from "./thinking-indicator";
import { ThreadIntro } from "./thread-intro";

/**
 * Everything above the composer: the turns, what is happening now, and what to
 * do next.
 *
 * Presentational. It decides what belongs on screen given the state it is
 * handed and nothing else, which is what keeps the container to the work of
 * deciding what that state should be.
 */
export function ThreadTranscript({
  messages,
  editorHref,
  seeded,
  sending,
  rendering,
  awaitingAnswer,
  partial,
  stage,
  notice,
  followUps,
  regeneratingId,
  onPickFollowUp,
  onCancelDraft,
  onRegenerate,
  onExtend,
  endRef,
}: {
  messages: readonly ChatMessage[];
  editorHref: Route;
  seeded: boolean;
  sending: boolean;
  rendering: boolean;
  /** True while a clarifying question is waiting on an answer. */
  awaitingAnswer: boolean;
  /** The reply so far, empty until the first piece arrives. */
  partial: string;
  stage: TurnStage | null;
  notice: string | null;
  followUps: readonly FollowUp[];
  regeneratingId: string | null;
  onPickFollowUp: (prompt: string) => void;
  onCancelDraft: (generationId: string) => void;
  onRegenerate: (generationId: string) => void;
  onExtend: (generationId: string) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    /* Centred while empty, top-aligned once there is a thread to read. A fixed
       top alignment left the invitation stranded against the header with ~425px
       of dead space beneath it, which reads as a broken layout rather than a
       quiet one. */
    <div
      className={cn(
        "flex flex-1 flex-col gap-6 py-8",
        messages.length === 0 && "justify-center pb-24",
      )}
    >
      {messages.length === 0 ? <ThreadIntro seeded={seeded} /> : null}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          editorHref={editorHref}
          onCancelDraft={onCancelDraft}
          onRegenerate={onRegenerate}
          onExtend={onExtend}
          regeneratingId={regeneratingId}
        />
      ))}

      {/* Not while something is in flight or a question is waiting: both are
          moments where another suggestion is one thing too many. */}
      {!sending && !rendering && !awaitingAnswer ? (
        <FollowUpChips
          suggestions={followUps}
          disabled={sending}
          // Filled, not sent. Same rule as "Use as inspiration": a chip that
          // starts a render spends a credit on one tap.
          onPick={onPickFollowUp}
        />
      ) : null}

      {/* The reply as it is written, in the place the finished one will occupy,
          so the text does not jump when the turn completes, and the staged
          progress only while there is nothing to show yet. */}
      {sending && partial !== "" ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{partial}</p>
      ) : null}

      {sending && partial === "" ? <ThinkingIndicator stage={stage} /> : null}

      {notice ? (
        <p role="status" className="text-center text-xs text-ink-soft">
          {notice}
        </p>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
