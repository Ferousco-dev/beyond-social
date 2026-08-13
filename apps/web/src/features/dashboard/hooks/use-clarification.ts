"use client";

import { useCallback, useState } from "react";

import { type sendMessage } from "@/features/chat/actions";
import { type PickerQuestion } from "@/lib/brief/schema";

/**
 * The held turn, and the questions standing between it and a credit.
 *
 * The state machine only: which question is being asked, what has been answered
 * so far, and when there is nothing left to ask. Sending is the caller's job,
 * because it needs the router, the notice line and the sending flag, none of
 * which this has any business owning.
 *
 * Lifted out of `ConversationThread`, which had grown past seven hundred lines
 * and held four unrelated concerns. This is the one with a shape of its own.
 */

/**
 * A turn waiting on answers before it is allowed to spend a credit.
 *
 * The payload is kept whole rather than rebuilt from the composer, which has
 * already been cleared by the time the questions arrive. Resending is then the
 * same turn with the answers added, not an approximation of it.
 */
export interface PendingClarification {
  readonly payload: Parameters<typeof sendMessage>[0];
  readonly questions: readonly PickerQuestion[];
  readonly answers: Readonly<Record<string, string>>;
  /** Why it is asking, said in the thread before the card appears. */
  readonly framing: string;
}

export interface Clarification {
  readonly pending: PendingClarification | null;
  /** The question being asked right now: the first with no answer yet. */
  readonly current: PickerQuestion | undefined;
  /** How many are answered, for the "2 of 3" counter. */
  readonly answered: number;
  readonly total: number;
  /** Holds a turn back until the questions are dealt with. */
  readonly hold: (held: Omit<PendingClarification, "answers">) => void;
  readonly answer: (value: string) => void;
  readonly skip: () => void;
  readonly clear: () => void;
}

export function useClarification(
  /**
   * Sends the held turn with whatever the user chose to tell us. Called on the
   * last answer and on a skip, since both are a decision to proceed.
   */
  onProceed: (
    payload: PendingClarification["payload"],
    answers: Readonly<Record<string, string>>,
  ) => void,
): Clarification {
  const [pending, setPending] = useState<PendingClarification | null>(null);

  const current = pending?.questions.find(
    (question) => pending.answers[question.label] === undefined,
  );

  const hold = useCallback((held: Omit<PendingClarification, "answers">) => {
    setPending({ ...held, answers: {} });
  }, []);

  const answer = useCallback(
    (value: string) => {
      if (!pending || !current) return;

      const answers = { ...pending.answers, [current.label]: value };
      const remaining = pending.questions.filter(
        (question) => answers[question.label] === undefined,
      );

      // The last answer sends it. Asking and then making them press a separate
      // button would be one more step than the turn needs.
      if (remaining.length === 0) {
        setPending(null);
        onProceed(pending.payload, answers);
        return;
      }
      setPending({ ...pending, answers });
    },
    [current, onProceed, pending],
  );

  const skip = useCallback(() => {
    if (!pending) return;
    // Skipping any question sends what we have. The point of the gate was to
    // avoid spending a credit blindly, not to collect a set.
    setPending(null);
    onProceed(pending.payload, pending.answers);
  }, [onProceed, pending]);

  const clear = useCallback(() => setPending(null), []);

  return {
    pending,
    current,
    answered: pending ? Object.keys(pending.answers).length : 0,
    total: pending?.questions.length ?? 0,
    hold,
    answer,
    skip,
    clear,
  };
}
