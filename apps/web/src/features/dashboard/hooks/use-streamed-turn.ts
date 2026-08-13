"use client";

import { useCallback, useRef, useState } from "react";

import { type sendMessage } from "@/features/chat/actions";
import { type SendResult, type TurnStage } from "@/lib/chat/turn";

/**
 * Sends a turn and reads it back as it happens.
 *
 * Wraps the SSE route so the thread deals in three things it already
 * understands: which step is running, the reply so far, and the final result.
 *
 * Falls back to the server action whenever the stream cannot be used, which
 * covers an old browser, a proxy that refuses the content type, and the route
 * being unreachable. The action returns the same `SendResult`, so a fallback is
 * slower and otherwise indistinguishable.
 */

interface StreamedTurn {
  /** The step currently running, or null between turns. */
  readonly stage: TurnStage | null;
  /** The reply so far. Empty until the first piece arrives. */
  readonly partial: string;
  readonly sending: boolean;
  readonly send: (payload: Parameters<typeof sendMessage>[0]) => Promise<SendResult>;
  /** Stops reading. The turn itself finishes server-side. */
  readonly cancel: () => void;
}

interface StreamEvent {
  type?: string;
  stage?: TurnStage;
  text?: string;
  result?: SendResult;
  message?: string;
}

export function useStreamedTurn(
  /** Used when the stream is unavailable. */
  fallback: (payload: Parameters<typeof sendMessage>[0]) => Promise<SendResult>,
): StreamedTurn {
  const [stage, setStage] = useState<TurnStage | null>(null);
  const [partial, setPartial] = useState("");
  const [sending, setSending] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  const send = useCallback(
    async (payload: Parameters<typeof sendMessage>[0]): Promise<SendResult> => {
      setSending(true);
      setPartial("");
      setStage(null);

      const controller = new AbortController();
      abort.current = controller;

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // A non-stream answer is the route refusing before it started, which is
        // a real result rather than a reason to retry through the action.
        if (!response.ok || !response.body) {
          if (response.status === 401) {
            return { status: "error", message: "Sign in again to continue" };
          }
          return await fallback(payload);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";
        let result: SendResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // Frames are separated by a blank line; a partial frame stays in the
          // buffer rather than being parsed as a truncated one.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.split("\n").find((part) => part.startsWith("data:"));
            if (!line) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line.slice(5).trim()) as StreamEvent;
            } catch {
              continue;
            }

            if (event.type === "stage" && event.stage) setStage(event.stage);
            else if (event.type === "chunk" && event.text) {
              assembled += event.text;
              setPartial(assembled);
            } else if (event.type === "result" && event.result) result = event.result;
            else if (event.type === "error") {
              result = { status: "error", message: event.message ?? "That could not be sent." };
            }
          }
        }

        // A stream that ended without a result is a dropped connection. The
        // turn may well have completed server-side, so this says so rather
        // than sending it again and paying for a second render.
        return (
          result ?? {
            status: "error",
            message: "The connection dropped. Refresh to see whether it went through.",
          }
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return { status: "error", message: "Stopped." };
        }
        return await fallback(payload);
      } finally {
        setSending(false);
        setStage(null);
        setPartial("");
        abort.current = null;
      }
    },
    [fallback],
  );

  return { stage, partial, sending, send, cancel };
}
