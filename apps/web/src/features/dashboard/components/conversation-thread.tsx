"use client";

import { type Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  pollGeneration,
  startGeneration as startVideoGeneration,
} from "@/features/generation/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { makeAssistantReply, SAMPLE_MESSAGES, type Message } from "@/lib/dashboard/conversations";

import { ConversationHeader } from "./conversation-header";
import { MessageBubble } from "./message-bubble";
import { PromptComposer } from "./prompt-composer";

const PENDING_PROMPT_KEY = "bs:pending-prompt";
const GENERATION_MS = 3200;
const POLL_MS = 3000;

export function ConversationThread({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) {
  const idCounter = useRef(0);
  const timers = useRef<number[]>([]);

  const [messages, setMessages] = useState<Message[]>(() =>
    conversationId === "new" ? [] : [...SAMPLE_MESSAGES],
  );
  const [prompt, setPrompt] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const editorHref = `/editor/${conversationId}` as Route;

  // Append the user's prompt and a generating draft, then resolve it. With
  // Supabase configured this runs a real kie.ai generation and polls for the
  // result; otherwise it plays the local demo animation.
  const startGeneration = useCallback(
    (text: string) => {
      const userId = `local-${idCounter.current++}`;
      const assistantId = `local-${idCounter.current++}`;

      setMessages((current) => [
        ...current,
        { id: userId, role: "user", content: text },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          draft: { caption: "Draft preview", status: "generating" },
        },
      ]);

      const patch = (updater: (message: Message) => Message) =>
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? updater(message) : message)),
        );

      const resolveReady = (resultUrl?: string) =>
        patch((message) => ({
          ...message,
          content: makeAssistantReply(text),
          draft: { caption: "Draft preview", status: "ready", resultUrl },
        }));

      const fail = (reason: string) =>
        patch((message) => ({ ...message, content: reason, draft: undefined }));

      if (!isSupabaseConfigured) {
        timers.current.push(window.setTimeout(() => resolveReady(), GENERATION_MS));
        return;
      }

      void (async () => {
        const started = await startVideoGeneration({ projectId: conversationId, prompt: text });
        if (started.status !== "ok") {
          fail("That did not go through. Please try again.");
          return;
        }
        const interval = window.setInterval(() => {
          void (async () => {
            const result = await pollGeneration(started.generationId);
            if (result.status === "ready") {
              window.clearInterval(interval);
              resolveReady(result.resultUrl ?? undefined);
            } else if (result.status === "failed" || result.status === "error") {
              window.clearInterval(interval);
              fail("That generation failed. Please try again.");
            }
          })();
        }, POLL_MS);
        timers.current.push(interval);
      })();
    },
    [conversationId],
  );

  // Seed a brand-new conversation from the dashboard composer (sessionStorage)
  // or from a trend card (the `prompt` query param).
  useEffect(() => {
    if (conversationId !== "new") return;
    const queryPrompt = new URLSearchParams(window.location.search).get("prompt");
    const pending = queryPrompt ?? window.sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_PROMPT_KEY);
    startGeneration(pending);
  }, [conversationId, startGeneration]);

  useEffect(() => {
    const pending = timers.current;
    return () =>
      pending.forEach((timer) => {
        window.clearTimeout(timer);
        window.clearInterval(timer);
      });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit() {
    const text = prompt.trim();
    if (!text) return;
    startGeneration(text);
    setPrompt("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <ConversationHeader title={title} editorHref={editorHref} />

      <div className="flex-1 space-y-6 py-8">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} editorHref={editorHref} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 bg-canvas pb-4 pt-2">
        <PromptComposer value={prompt} onChange={setPrompt} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
