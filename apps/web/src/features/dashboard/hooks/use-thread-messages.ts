"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cancelGeneration, readDraftState } from "@/features/generation/actions";
import { type ChatMessage, type Thread } from "@/lib/chat/thread";

import { useExtendDraft } from "./use-extend-draft";
import { useGenerationPoll, type PollOutcome } from "./use-generation-poll";
import { useGenerationRealtime } from "./use-generation-realtime";
import { useRegenerateDraft } from "./use-regenerate-draft";

/**
 * What the thread is showing, and the drafts still moving in it.
 *
 * The messages on screen are not simply what the server returned: a turn is
 * drawn before it is saved, a render lands minutes after the reply, and both
 * have to reconcile with whatever the server says next. That reconciliation is
 * one job, and it is this one.
 *
 * Every id created here is prefixed so an optimistic row can be told from a
 * saved one without asking the server which is which.
 */
export const OPTIMISTIC = "pending:";

export interface ThreadMessages {
  readonly messages: readonly ChatMessage[];
  readonly setMessages: (
    update: (current: readonly ChatMessage[]) => readonly ChatMessage[],
  ) => void;
  /** A fresh optimistic id, unique within this screen's lifetime. */
  readonly nextId: () => string;
  /** True while any draft is still rendering. */
  readonly rendering: boolean;
  readonly watch: (generationId: string) => void;
  readonly cancelDraft: (generationId: string) => void;
  readonly regenerate: (generationId: string) => void;
  readonly extend: (generationId: string) => void;
  /** The draft being regenerated, so its card can say so. */
  readonly regeneratingId: string | null;
}

export function useThreadMessages(
  thread: Thread,
  confirm: Parameters<typeof useRegenerateDraft>[0]["confirm"],
  onNotice: (notice: string, upgrade?: boolean) => void,
): ThreadMessages {
  const [messages, setMessages] = useState<readonly ChatMessage[]>(thread.messages);
  const counter = useRef(0);

  // The server is the source of truth: a navigation or revalidation replaces
  // whatever optimistic state is on screen.
  useEffect(() => {
    setMessages((current) => {
      /*
       * With one exception. The first message of a new chat is sent from
       * `/dashboard/c/new`, whose thread is empty by definition, and the
       * project is only created by that send. Until the navigation to the real
       * project lands, any re-render of the layout pushes that empty thread
       * back down here, and adopting it wiped the message the user had just
       * sent: they watched their own turn disappear.
       *
       * An empty thread never has anything to teach a screen that is already
       * showing unsaved messages, so it is ignored. Anything the server
       * actually has still wins, which is what settles the optimistic ids.
       */
      const unsaved = current.some((message) => message.id.startsWith(OPTIMISTIC));
      if (thread.messages.length === 0 && unsaved) return current;
      return thread.messages;
    });
  }, [thread.messages]);

  /**
   * Settles one draft from what the database says about its generation.
   *
   * The single writer both completion paths funnel through, the client poll
   * and the Realtime push, which is what makes a duplicate landing harmless:
   * the second write describes the same state and changes nothing. The state
   * comes from `readDraftState` rather than the poll's raw answer, so the
   * result link is one signed for the private bucket now, not the stored
   * public URL that stopped resolving when the bucket closed.
   */
  const settleDraft = useCallback(
    (generationId: string) => {
      void (async () => {
        const state = await readDraftState(generationId);
        if (state === null) return;
        if (state.status === "cancelled") return;

        setMessages((current) =>
          current.map((message) =>
            message.draft?.generationId === generationId
              ? {
                  ...message,
                  draft: {
                    ...message.draft,
                    status:
                      state.status === "ready"
                        ? ("ready" as const)
                        : ("failed" as const),
                    resultUrl: state.status === "ready" ? state.resultUrl : null,
                    error: state.error,
                  },
                }
              : message,
          ),
        );
        if (state.status !== "ready" && state.error?.trim()) onNotice(state.error);
      })();
    },
    [onNotice, setMessages],
  );

  const applyOutcome = useCallback(
    (generationId: string, outcome: PollOutcome) => {
      /*
       * The poll's own answer is only the trigger. What lands in the thread is
       * re-read from the row, for the signed link and the recorded reason the
       * poll result does not carry.
       */
      settleDraft(generationId);
      if (outcome.status === "failed") onNotice(outcome.reason);
    },
    [onNotice, settleDraft],
  );

  const { watch, stop } = useGenerationPoll(applyOutcome);

  // Status pushed by the database for drafts this session is not polling:
  // another tab, a draft started before a reload, a poll that gave up. The
  // poll keeps its own watch on anything this session started.
  useGenerationRealtime(settleDraft);

  const append = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const { regenerate, busyId: regeneratingId } = useRegenerateDraft({
    confirm,
    onMessage: append,
    onNotice,
    onStarted: watch,
  });

  const { extend } = useExtendDraft({
    confirm,
    onMessage: append,
    onNotice,
    onStarted: watch,
  });

  /**
   * Stops waiting for a render. The provider cannot be told to stop, so the
   * render finishes and is charged either way; this only settles the row and
   * ends the polling. The notice says as much, because a control that reads
   * like undo and is not would be worse than no control at all.
   */
  const cancelDraft = useCallback(
    (generationId: string) => {
      stop(generationId);
      setMessages((current) =>
        current.filter((message) => message.draft?.generationId !== generationId),
      );
      onNotice("Stopped waiting. That render still finishes and is charged.");
      void cancelGeneration(generationId);
    },
    [onNotice, stop],
  );

  return {
    messages,
    setMessages,
    nextId: useCallback(() => `${OPTIMISTIC}${counter.current++}`, []),
    // A render outlives the request that started it: `sending` goes false as
    // soon as the reply arrives, while the video keeps rendering for about
    // another minute. Sending again in that window starts a second render and
    // spends a second credit, so the composer stays locked until it settles.
    rendering: messages.some((message) => message.draft?.status === "generating"),
    watch,
    cancelDraft,
    regenerate,
    extend,
    regeneratingId,
  };
}
