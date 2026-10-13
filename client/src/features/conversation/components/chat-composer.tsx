"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { MAX_ATTACHMENTS, type useAttachments } from "../hooks/use-attachments";
import { useVoiceRecorder } from "../hooks/use-voice-recorder";
import { AttachMenu } from "./attach-menu";
import { AttachmentChips } from "./attachment-chips";

const MAX_LENGTH = 2000;

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  attachments,
  onNotice,
  focusTick,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSend: () => void;
  readonly disabled: boolean;
  readonly attachments: ReturnType<typeof useAttachments>;
  /** Reports a problem with a pick or a recording. */
  readonly onNotice: (message: string | null) => void;
  /** Changes when something outside asks for the box to take focus. */
  readonly focusTick: number;
}): ReactNode {
  const ref = useRef<HTMLTextAreaElement>(null);
  const voice = useVoiceRecorder((file) => attachments.add([file]));
  const hasContent = value.trim() !== "" || attachments.readyIds.length > 0;
  const canSend = !disabled && !attachments.busy && !voice.recording && hasContent;

  useEffect(() => {
    if (focusTick > 0) ref.current?.focus();
  }, [focusTick]);

  useEffect(() => {
    onNotice(voice.error ?? attachments.notice);
  }, [voice.error, attachments.notice, onNotice]);

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
    <form onSubmit={submit} className="rounded-3xl border border-hairline bg-paper p-2 focus-within:border-primary">
      <AttachmentChips items={attachments.items} onRemove={attachments.remove} />
      <div className="flex items-end gap-1">
        <AttachMenu
          onFiles={attachments.add}
          disabled={disabled || attachments.items.length >= MAX_ATTACHMENTS}
          recording={voice.recording}
          canRecord={voice.supported}
          onRecord={() => void voice.start()}
          onStopRecording={voice.stop}
        />
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        {voice.recording ? (
          <p className="min-h-11 flex-1 px-3 py-3 text-sm text-ink" aria-live="polite">
            Recording {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}
          </p>
        ) : (
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
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
          />
        )}
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </div>
    </form>
  );
}
