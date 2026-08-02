"use client";

import { useCallback, useState } from "react";

import { regenerateGeneration } from "@/features/generation/actions";
import { REGENERATE_REPLY } from "@/features/generation/regenerate-copy";
import { type ChatMessage } from "@/lib/chat/thread";

/**
 * Running a finished draft again.
 *
 * Kept out of the thread component because that file is already the largest in
 * the feature, and this is a self-contained exchange: confirm, start, append a
 * draft to watch.
 */
export function useRegenerateDraft({
  confirm,
  onMessage,
  onNotice,
  onStarted,
}: {
  confirm: (options: {
    title: string;
    description: string;
    confirmLabel: string;
  }) => Promise<boolean>;
  onMessage: (message: ChatMessage) => void;
  onNotice: (notice: string) => void;
  /** Called with the new generation id so the caller can poll it. */
  onStarted: (generationId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const regenerate = useCallback(
    async (generationId: string) => {
      /*
       * Confirmed before anything is sent. A render is charged whether or not
       * the second one is better, and the menu item sits one tap from a play
       * button, so an accidental press has to cost a dialog rather than money.
       *
       * The exact price is not quoted here: it depends on the model the run
       * resolves to, and a number invented in the client that disagreed with
       * what was actually charged would be worse than no number at all.
       */
      const agreed = await confirm({
        title: "Run this again?",
        description:
          "This starts a new render and spends credits. The draft you already have is kept.",
        confirmLabel: "Regenerate",
      });
      if (!agreed) return;

      setBusyId(generationId);
      const result = await regenerateGeneration({ generationId });
      setBusyId(null);

      if (result.status !== "ok") {
        onNotice(
          result.status === "unconfigured"
            ? "The backend is not connected yet, so nothing can be generated."
            : result.message,
        );
        return;
      }

      onMessage({
        id: `pending:regen-${result.generationId}`,
        role: "assistant",
        content: REGENERATE_REPLY,
        attachments: [],
        draft: { generationId: result.generationId, status: "generating", resultUrl: null },
      });
      onStarted(result.generationId);
    },
    [confirm, onMessage, onNotice, onStarted],
  );

  return { regenerate, busyId };
}
