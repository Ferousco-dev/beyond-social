"use client";

import { ArrowUp, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { type EditorState } from "../hooks/use-editor-state";
import { ASSISTANT_ACTIONS, matchAction } from "../lib/assistant-actions";

interface Entry {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const GREETING =
  "I can restyle, retime, and grade what is on the timeline. Pick an action or describe the change.";

/**
 * The editing assistant. Every action here is a real edit against the project,
 * so the panel changes the timeline rather than narrating changes it cannot
 * make. Open-ended instructions are matched to those same actions; anything it
 * cannot map, it says so plainly rather than pretending.
 */
export function EditorChat({
  className,
  onClose,
  editor,
}: {
  className?: string;
  onClose?: () => void;
  editor: EditorState;
}) {
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, role: "assistant", text: GREETING }]);
  const [prompt, setPrompt] = useState("");

  const say = (role: Entry["role"], text: string): void =>
    setEntries((current) => [...current, { id: current.length, role, text }]);

  const run = (actionId: string): void => {
    const action = ASSISTANT_ACTIONS.find((candidate) => candidate.id === actionId);
    if (!action) return;
    say("user", action.label);
    say("assistant", action.run(editor));
  };

  const submit = (): void => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");
    say("user", text);

    const action = matchAction(text);
    if (action) {
      say("assistant", action.run(editor));
      return;
    }
    say(
      "assistant",
      "I cannot do that one yet. I can add transitions, punch the grade, restyle captions, retime a shot, or duck the music.",
    );
  };

  return (
    <div
      className={cn(
        "flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Sparkles className="size-4 text-primary" />
          Assistant
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={cn(
              "max-w-[85%] text-pretty rounded-xl px-3 py-2 text-xs leading-relaxed",
              entry.role === "user" ? "ml-auto bg-cloud text-ink" : "bg-canvas text-ink-soft",
            )}
          >
            {entry.text}
          </p>
        ))}
      </div>

      <div className="border-t border-hairline p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {ASSISTANT_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => run(action.id)}
              className="cursor-pointer rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 rounded-xl border border-hairline bg-canvas p-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Describe a change..."
            aria-label="Describe a change"
            className="max-h-24 min-h-6 flex-1 resize-none bg-transparent text-xs text-ink placeholder:text-ink-soft focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={prompt.trim() === ""}
            aria-label="Send"
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
