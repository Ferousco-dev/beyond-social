"use client";

import { useCallback, useEffect, useState } from "react";

import { type ModelAnswer } from "@/lib/generation/confirm-model";
import { holdTurn, readHeldTurn, releaseHeldTurn, type HeldTurn } from "@/lib/composer/held-turn";

/**
 * The turn held back while the user decides whether to spend more on it.
 *
 * The state machine only, in the shape `useClarification` already established:
 * what is being asked, and a hand back to the caller once it is answered.
 * Sending belongs to the thread, which owns the router and the notice line.
 *
 * The one thing this adds is durability. The clarifying questions can afford to
 * vanish on a reload because nothing had been decided; a priced offer cannot,
 * because the brief and its attachments would have to be assembled again.
 */

export interface ModelConfirmation {
  /** The turn waiting on an answer, or null when nothing is being asked. */
  readonly pending: HeldTurn | null;
  /** Holds a turn back and puts the question on screen. */
  readonly ask: (held: HeldTurn) => void;
  /** Sends it, either way. Declining is an answer, not a cancellation. */
  readonly answer: (accepted: boolean) => void;
}

export function useModelConfirmation(
  /** Which thread this is, so a stored offer surfaces on the right one. */
  projectId: string,
  onProceed: (payload: HeldTurn["payload"], answer: ModelAnswer) => void,
): ModelConfirmation {
  const [pending, setPending] = useState<HeldTurn | null>(null);

  // Picked back up after a reload, which is the whole point of storing it. The
  // read is client-only, so it runs here rather than during render.
  useEffect(() => {
    setPending(readHeldTurn(projectId));
  }, [projectId]);

  const ask = useCallback((held: HeldTurn) => {
    holdTurn(held);
    setPending(held);
  }, []);

  const answer = useCallback(
    (accepted: boolean) => {
      if (!pending) return;

      // Released before sending, not after: the turn is on its way, and an
      // offer left in storage would be asked again by the next reload.
      releaseHeldTurn();
      setPending(null);
      onProceed(pending.payload, { modelId: pending.upgrade.modelId, accepted });
    },
    [onProceed, pending],
  );

  return { pending, ask, answer };
}
