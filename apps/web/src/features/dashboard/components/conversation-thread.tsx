"use client";

import { type Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { sendMessage } from "@/features/chat/actions";
import { type ChatMessage, type Thread } from "@/lib/chat/thread";
import { cn } from "@/lib/utils";

import { useGenerationPoll, type PollOutcome } from "../hooks/use-generation-poll";
import { ConversationHeader } from "./conversation-header";
import { MessageBubble } from "./message-bubble";
import { PromptComposer } from "./prompt-composer";
import { ThinkingIndicator } from "./thinking-indicator";
import { type PendingPhoto } from "./compose-menu";

const PENDING_PROMPT_KEY = "bs:pending-prompt";

/** Optimistic ids are prefixed so a server id can never collide with one. */
const OPTIMISTIC = "pending:";

export function ConversationThread({ thread }: { thread: Thread }) {
  const router = useRouter();
  const [messages, setMessages] = useState<readonly ChatMessage[]>(thread.messages);
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState<readonly PendingPhoto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  const projectId = thread.projectId ?? "new";
  const editorHref = `/editor/${projectId}` as Route;

  // The server is the source of truth: a navigation or revalidation replaces
  // whatever optimistic state is on screen.
  useEffect(() => {
    setMessages(thread.messages);
  }, [thread.messages]);

  const applyOutcome = useCallback((generationId: string, outcome: PollOutcome) => {
    setMessages((current) =>
      current.map((message) =>
        message.draft?.generationId === generationId
          ? {
              ...message,
              draft:
                outcome.status === "ready"
                  ? { ...message.draft, status: "ready" as const, resultUrl: outcome.resultUrl }
                  : { ...message.draft, status: "failed" as const, resultUrl: null },
            }
          : message,
      ),
    );
    if (outcome.status === "failed") setNotice(outcome.reason);
  }, []);

  const { watch } = useGenerationPoll(applyOutcome);

  // Resume watching anything still in flight, including after a reload. This is
  // the payoff from persisting the thread: a refresh mid-generation picks the
  // draft back up instead of stranding it.
  useEffect(() => {
    for (const message of messages) {
      if (message.draft?.status === "generating") watch(message.draft.generationId);
    }
  }, [messages, watch]);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed === "" || sending) return;

      setSending(true);
      setNotice(null);
      setPrompt("");

      const optimisticId = `${OPTIMISTIC}${counter.current++}`;
      const attached = photos.map((photo) => photo.url);
      setPhotos([]);
      setMessages((current) => [...current, { id: optimisticId, role: "user", content: trimmed }]);

      void (async () => {
        const result = await sendMessage({
          projectId,
          prompt: trimmed,
          imageUrls: attached.length > 0 ? attached : undefined,
        });
        setSending(false);

        if (result.status !== "ok") {
          // The optimistic message is withdrawn: leaving it on screen would
          // imply the turn was recorded when it was not.
          setMessages((current) => current.filter((message) => message.id !== optimisticId));
          setPrompt(trimmed);
          setNotice(
            result.status === "unconfigured"
              ? "The backend is not connected yet, so nothing can be generated."
              : result.message,
          );
          return;
        }

        if (result.notice) setNotice(result.notice);

        // A brand-new thread now has a real project, so move to its URL and let
        // the server component load the persisted turn.
        if (projectId === "new") {
          router.replace(`/dashboard/c/${result.projectId}` as Route);
          return;
        }

        /**
         * The reply is appended from what the action already returned rather
         * than refetching the thread. `router.refresh()` re-rendered the whole
         * server component to obtain a message we were already holding, which
         * added a full round trip to every turn before the answer appeared.
         *
         * The server is still the source of truth: the next navigation or
         * revalidation replaces this with the persisted rows.
         */
        setMessages((current) => [
          ...current,
          {
            id: `${OPTIMISTIC}reply-${counter.current++}`,
            role: "assistant",
            content: result.reply,
            ...(result.generationId
              ? {
                  draft: {
                    generationId: result.generationId,
                    status: "generating" as const,
                    resultUrl: null,
                  },
                }
              : {}),
          },
        ]);
      })();
    },
    [projectId, photos, router, sending],
  );

  // Seeded from the dashboard composer or a trend card. The key is cleared
  // before submitting so a re-render cannot fire a second generation.
  useEffect(() => {
    if (thread.projectId !== null) return;
    const queryPrompt = new URLSearchParams(window.location.search).get("prompt");
    const pending = queryPrompt ?? window.sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_PROMPT_KEY);
    submit(pending);
    // A one-shot seed, so it must not re-run when `submit` is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <ConversationHeader title={thread.title} editorHref={editorHref} />

      {/* Centred while empty, top-aligned once there is a thread to read. A
          fixed top alignment left the invitation stranded against the header
          with ~425px of dead space beneath it, which reads as a broken layout
          rather than a quiet one. */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-6 py-8",
          messages.length === 0 && "justify-center pb-24",
        )}
      >
        {messages.length === 0 ? (
          <div className="text-center">
            <p className="text-sm font-medium text-ink">Describe the video you want</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
              Say what it is for and who it is for. Add photos and they become the footage.
            </p>
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} editorHref={editorHref} />
        ))}

        {/* Sits where the reply will appear, so the answer replaces the
            progress rather than arriving somewhere else. */}
        {sending ? <ThinkingIndicator /> : null}

        {notice ? (
          <p role="status" className="text-center text-xs text-ink-soft">
            {notice}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-canvas pb-4 pt-2">
        <PromptComposer
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => submit(prompt)}
          projectId={projectId}
          photos={photos}
          onPhotosChange={setPhotos}
          busy={sending}
        />
      </div>
    </div>
  );
}
