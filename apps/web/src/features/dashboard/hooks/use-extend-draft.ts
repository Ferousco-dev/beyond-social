"use client";

import { useCallback, useState } from "react";

import { extendGeneration } from "@/features/generation/extend-actions";
import { type ChatMessage } from "@/lib/chat/thread";

/** What the thread says while a continuation is rendering. */
export const EXTEND_REPLY = "Continuing from where that one ends.";

/**
 * Continuing a finished draft.
 *
 * The same shape as regenerating, and separate for the same reason: the thread
 * component is already the largest file in the feature, and this is a
 * self-contained exchange of confirm, start, append a draft to watch.
 *
 * The confirmation is not optional. A continuation costs a credit exactly like
 * a fresh render, and the menu item sits a tap away from play.
 */
export function useExtendDraft({
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

  const extend = useCallback(
    async (generationId: string) => {
      const agreed = await confirm({
        title: "Continue this clip?",
        description:
          "This generates a new clip that continues the story, and costs one credit. You can chain as many continuations as you like.",
        confirmLabel: "Continue",
      });
      if (!agreed) return;

      setBusyId(generationId);
      const result = await extendGeneration({ generationId });
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
        id: `pending:extend-${result.generationId}`,
        role: "assistant",
        content: EXTEND_REPLY,
        attachments: [],
        draft: { generationId: result.generationId, status: "generating", resultUrl: null },
      });
      onStarted(result.generationId);
    },
    [confirm, onMessage, onNotice, onStarted],
  );

  return { extend, busyId };
}
