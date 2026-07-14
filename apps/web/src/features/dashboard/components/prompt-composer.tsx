"use client";

import { ArrowUp, Plus } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function PromptComposer({ value, onChange, onSubmit }: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0;

  function handleChange(next: string) {
    onChange(next);
    const element = textareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="rounded-3xl bg-paper p-2.5 shadow-card">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Describe a video to create"
        aria-label="Describe a video to create"
        className="block max-h-40 w-full resize-none bg-transparent px-3 py-2 text-base leading-6 text-ink placeholder:text-ink-soft focus:outline-none"
      />
      <div className="flex items-center justify-between px-1 pt-1">
        <button
          type="button"
          aria-label="Add photos"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-cloud"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          aria-label="Send"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
