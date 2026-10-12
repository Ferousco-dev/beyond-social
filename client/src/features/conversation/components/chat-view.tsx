"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { type ChatMessage } from "@/lib/go-api/schemas";

import { sendChatMessage, startConversation } from "../actions";
import { ChatComposer } from "./chat-composer";
import { MessageBubble } from "./message-bubble";

/** A conversation with the assistant. A new one is only created on the first send. */
export function ChatView({
  conversationId,
  initialMessages,
  initialPrompt,
  firstName,
}: {
  readonly conversationId: string | null;
  readonly initialMessages: readonly ChatMessage[];
  readonly initialPrompt: string;
  readonly firstName: string;
}): ReactNode {
  const [id, setId] = useState(conversationId);
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState(initialPrompt);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Kept across a failed attempt so retrying the same text is not answered twice.
  const attempt = useRef<{ text: string; key: string } | null>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending]);

  async function send(): Promise<void> {
    const text = draft.trim();
    if (text === "" || pending !== null) return;
    if (attempt.current?.text !== text) attempt.current = { text, key: crypto.randomUUID() };
    const { key } = attempt.current;

    setError(null);
    setPending(text);
    setDraft("");

    let target = id;
    if (target === null) {
      const started = await startConversation();
      if (started.status !== "ok") {
        fail(text, started.message);
        return;
      }
      target = started.conversationId;
      setId(target);
    }

    const result = await sendChatMessage({ conversationId: target, content: text, idempotencyKey: key });
    if (result.status !== "ok") {
      fail(text, result.message);
      return;
    }
    attempt.current = null;
    // Only now: changing the address while the turn is in flight makes Next
    // re-render the page and stall the request.
    window.history.replaceState(null, "", `/dashboard/c/${target}`);
    setPending(null);
    setMessages((current) => [...current, result.user, result.assistant]);
  }

  function fail(text: string, message: string): void {
    setPending(null);
    setDraft(text);
    setError(message);
  }

  const empty = messages.length === 0 && pending === null;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">
      <div className="min-h-0 flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="pt-[12vh] text-center">
            <p className="text-base text-ink-soft">Hi {firstName}</p>
            <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-ink">What would you like to create?</h1>
          </div>
        ) : (
          <ul aria-label="Conversation" aria-live="polite" className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {pending !== null ? (
              <>
                <li className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-ink px-4 py-2.5 text-sm text-paper sm:max-w-[75%]">
                    {pending}
                  </p>
                </li>
                <li className="text-sm text-ink-soft">Thinking…</li>
              </>
            ) : null}
            <li ref={endRef} aria-hidden />
          </ul>
        )}
      </div>

      {/* pb-safe sits on its own element: put beside pb-4 it overrides it, and the
          composer ends up flush with the bottom edge. */}
      <div className="pb-safe shrink-0 bg-canvas">
        <div className="pb-4 pt-2">
          {error ? (
            <p role="alert" className="mb-2 px-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <ChatComposer value={draft} onChange={setDraft} onSend={() => void send()} disabled={pending !== null} />
        </div>
      </div>
    </div>
  );
}
