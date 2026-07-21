"use client";

import { type Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";

import { makeAssistantReply, SAMPLE_MESSAGES, type Message } from "@/lib/dashboard/conversations";

import { MessageBubble } from "./message-bubble";
import { PromptComposer } from "./prompt-composer";

const PENDING_PROMPT_KEY = "bs:pending-prompt";
const GENERATION_MS = 3200;

export function ConversationThread({ conversationId }: { conversationId: string }) {
  const idCounter = useRef(0);
  const timers = useRef<number[]>([]);

  const [messages, setMessages] = useState<Message[]>(() =>
    conversationId === "new" ? [] : [...SAMPLE_MESSAGES],
  );
  const [prompt, setPrompt] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Append the user's prompt, show a generating draft, then resolve it to ready.
  const startGeneration = useCallback((text: string) => {
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

    const timer = window.setTimeout(() => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: makeAssistantReply(text),
                draft: { caption: "Draft preview", status: "ready" },
              }
            : message,
        ),
      );
    }, GENERATION_MS);
    timers.current.push(timer);
  }, []);

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
    return () => pending.forEach((timer) => window.clearTimeout(timer));
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
      <div className="flex-1 space-y-6 py-8">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            editorHref={`/editor/${conversationId}` as Route}
          />
        ))}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 bg-canvas pb-4 pt-2">
        <PromptComposer value={prompt} onChange={setPrompt} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
