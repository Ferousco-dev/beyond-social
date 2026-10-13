"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { chatMessageSchema, type ChatMessage } from "@/lib/go-api/schemas";
import { useEventSocket } from "@/lib/go-api/use-event-socket";

import { loadThread, sendChatMessage, startConversation } from "../actions";
import { useAttachments } from "../hooks/use-attachments";
import { ErrorHelp } from "@/components/billing/error-help";
import { ChatComposer } from "./chat-composer";
import { MessageBubble } from "./message-bubble";
import { OpenEditorButton } from "./open-editor-button";

const liveMessage = chatMessageSchema.extend({ conversation_id: z.string() });

/** Adds messages by id, oldest first, so an event and a reply carrying the same message show once. */
function merge(current: readonly ChatMessage[], incoming: readonly ChatMessage[]): readonly ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

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
  const router = useRouter();
  const [id, setId] = useState(conversationId);
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState(initialPrompt);
  const [pending, setPending] = useState<{ text: string; files: readonly string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [focusTick, setComposerFocus] = useState(0);
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const attachments = useAttachments();
  // Kept across a failed attempt so retrying the same text is not answered twice.
  const attempt = useRef<{ text: string; key: string } | null>(null);
  const endRef = useRef<HTMLLIElement>(null);

  // Jobs started in this thread whose result has not arrived yet.
  const watching = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of messages) if (m.job_id) count.set(m.job_id, (count.get(m.job_id) ?? 0) + 1);
    return new Set([...count].filter(([, n]) => n === 1).map(([jobId]) => jobId));
  }, [messages]);

  // Only the newest script offers actions: an older one has been replaced.
  const latestScriptId = useMemo(() => [...messages].reverse().find((m) => m.script)?.id ?? null, [messages]);

  const catchUp = useCallback(async () => {
    if (id === null) return;
    const thread = await loadThread(id);
    if (thread.status === "ok") setMessages((current) => merge(current, thread.messages));
  }, [id]);

  useEventSocket({
    active: id !== null,
    onReady: () => void catchUp(),
    onEvent: (event) => {
      if (event.type !== "chat.message") return;
      const parsed = liveMessage.safeParse(event.payload);
      if (parsed.success && parsed.data.conversation_id === id) setMessages((current) => merge(current, [parsed.data]));
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending]);

  async function send(override?: string): Promise<void> {
    const text = (override ?? draft).trim();
    const attachmentIds = attachments.readyIds;
    if ((text === "" && attachmentIds.length === 0) || pending !== null || attachments.busy) return;
    const signature = `${text}|${attachmentIds.join(",")}`;
    if (attempt.current?.text !== signature) attempt.current = { text: signature, key: crypto.randomUUID() };
    const { key } = attempt.current;

    setError(null);
    setPending({ text, files: attachments.items.map((item) => item.file.name || "Voice note") });
    // A canned reply (a script choice) leaves whatever is being typed alone.
    if (override === undefined) setDraft("");

    let target = id;
    if (target === null) {
      const started = await startConversation();
      if (started.status !== "ok") {
        fail(override === undefined ? text : null, started.message);
        return;
      }
      target = started.conversationId;
      setId(target);
    }

    const result = await sendChatMessage({ conversationId: target, content: text, idempotencyKey: key, attachments: [...attachmentIds], timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (result.status !== "ok") {
      fail(override === undefined ? text : null, result.message, result.code);
      return;
    }
    attempt.current = null;
    attachments.clear();
    // Only now: changing the address while the turn is in flight makes Next
    // re-render the page and stall the request.
    window.history.replaceState(null, "", `/dashboard/c/${target}`);
    setPending(null);
    setMessages((current) => merge(current, [result.user, result.assistant]));
    // The sidebar balance is rendered by the layout.
    router.refresh();
  }

  function fail(text: string | null, message: string, code?: string): void {
    setPending(null);
    if (text !== null) setDraft(text);
    setError(message);
    setErrorCode(code);
  }

  const empty = messages.length === 0 && pending === null;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">
      {id !== null && !empty ? (
        <div className="flex shrink-0 justify-end pt-3">
          <OpenEditorButton conversationId={id} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="pt-[12vh] text-center">
            <p className="text-base text-ink-soft">Hi {firstName}</p>
            <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-ink">What would you like to create?</h1>
          </div>
        ) : (
          <ul aria-label="Conversation" aria-live="polite" className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onReply={(text) => void send(text)} onChange={() => setComposerFocus((n) => n + 1)} latestScript={message.id === latestScriptId} watching={message.job_id !== undefined && watching.has(message.job_id)} />
            ))}
            {pending !== null ? (
              <>
                <li className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-ink px-4 py-2.5 text-sm text-paper sm:max-w-[75%]">
                    {pending.text || pending.files.join(", ")}
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
          {error ?? composerNotice ? (
            <p role="alert" className="mb-2 px-2 text-sm text-destructive">
              {error ?? composerNotice} {error ? <ErrorHelp code={errorCode} /> : null}
            </p>
          ) : null}
          <ChatComposer
            value={draft}
            onChange={setDraft}
            onSend={() => void send()}
            disabled={pending !== null}
            attachments={attachments}
            onNotice={setComposerNotice}
            focusTick={focusTick}
          />
        </div>
      </div>
    </div>
  );
}
