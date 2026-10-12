"use client";

import { ArrowUp } from "lucide-react";
import { useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

const MAX_LENGTH = 2000;

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSend: () => void;
  readonly disabled: boolean;
}): ReactNode {
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && value.trim() !== "";

  function resize(): void {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (canSend) onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    // Enter sends, Shift+Enter breaks the line. Never mid-composition (IME).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-3xl border border-hairline bg-paper p-2 focus-within:border-primary">
      <label htmlFor="chat-message" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-message"
        ref={ref}
        rows={1}
        maxLength={MAX_LENGTH}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
        placeholder="Ask, or describe what to make"
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp className="size-5" aria-hidden />
      </button>
    </form>
  );
}
