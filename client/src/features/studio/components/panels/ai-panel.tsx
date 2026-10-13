"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ErrorHelp } from "@/components/billing/error-help";
import { cn } from "@/lib/utils";

import { useAssistant } from "../../hooks/use-assistant";
import { RememberCard } from "./remember-card";
import { SceneCard } from "./scene-card";

const SUGGESTIONS = [
  "Watch my clip and tell me what happens",
  "Add the next scene",
  "Add a title at the start",
  "Cut the clip in half at the playhead",
  "Make the captions yellow and bigger",
];

export function AiPanel() {
  const { messages, busy, error, errorCode, send, confirmScene, dismissScene, confirmRemember, dismissRemember, clear } = useAssistant();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <Sparkles className="size-9 text-primary" strokeWidth={1.25} aria-hidden />
            <p className="text-base font-medium text-ink">Edit by asking</p>
            <p className="text-sm text-ink-soft">Tell it what to change. It makes supported timeline edits, and you can undo them.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => void send(text)}
                  className="cursor-pointer rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul aria-live="polite" className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
                {m.scene ? (
                  <SceneCard scene={m.scene} onConfirm={() => void confirmScene(m.id)} onDismiss={() => dismissScene(m.id)} />
                ) : m.remember ? (
                  <RememberCard proposal={m.remember} onSave={() => void confirmRemember(m.id)} onDismiss={() => dismissRemember(m.id)} />
                ) : (
                  <p className={cn("max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-ink text-paper" : "bg-cloud text-ink")}>
                    {m.content}
                  </p>
                )}
              </li>
            ))}
            {busy ? <li className="text-sm text-ink-soft">Working…</li> : null}
            <li ref={end} aria-hidden />
          </ul>
        )}
      </div>
      {error ? (
        <p role="alert" className="shrink-0 px-3 pb-2 text-xs text-destructive">
          {error} <ErrorHelp code={errorCode} className="font-medium text-ink underline underline-offset-2" />
        </p>
      ) : null}
      <div className="shrink-0 p-2">
        <form
          onSubmit={submit}
          className="relative rounded-lg border border-hairline bg-canvas transition-colors focus-within:border-primary"
        >
          <label htmlFor="assistant-input" className="sr-only">
            Ask for an edit
          </label>
          <textarea
            id="assistant-input"
            value={draft}
            rows={2}
            maxLength={1000}
            placeholder="Ask for an edit"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className="block max-h-40 min-h-16 w-full resize-none bg-transparent py-3 pl-3 pr-12 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={busy || draft.trim() === ""}
            aria-label="Send"
            className="absolute bottom-2 right-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] leading-4 text-ink-soft">
          <span>Older messages are left out automatically. 1 credit per message.</span>
          {messages.length > 0 ? (
            <button type="button" onClick={clear} className="shrink-0 cursor-pointer hover:text-ink">
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
