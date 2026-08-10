"use client";

import { Check, CornerDownLeft } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { type IdeaAnalysis } from "@/lib/brief/schema";
import { cn } from "@/lib/utils";

type Question = IdeaAnalysis["questions"][number];

/**
 * One question, asked the way the rest of the product talks.
 *
 * Options are suggestions, not a menu. Every one of them is a guess about what
 * somebody might want, and a guess that cannot be argued with is a form field
 * wearing a chat bubble. So there is always a text box underneath, and an answer
 * typed there is worth exactly as much as one that was offered.
 *
 * An answered question collapses to the answer. The thread is a record of what
 * was decided, and leaving four sets of unchosen options on screen makes it a
 * record of what was not.
 */
export function QuestionTurn({
  question,
  answer,
  onAnswer,
  disabled,
}: {
  question: Question;
  answer: string | undefined;
  onAnswer: (value: string) => void;
  disabled: boolean;
}) {
  const [custom, setCustom] = useState("");

  function submitCustom() {
    const value = custom.trim();
    if (value === "") return;
    onAnswer(value);
    setCustom("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitCustom();
    }
  }

  if (answer !== undefined) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink">{question.question}</p>
        <p className="flex items-center gap-2 self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-paper">
          <Check className="size-3.5 shrink-0 opacity-70" aria-hidden />
          {answer}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{question.label}</p>
      <p className="text-sm text-ink">{question.question}</p>

      <div role="group" aria-label={question.question} className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(option)}
            className={cn(
              "cursor-pointer rounded-full border border-hairline bg-paper px-4 py-2 text-sm text-ink transition-colors pointer-coarse:min-h-11",
              "hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="relative">
        <label htmlFor={`answer-${question.label}`} className="sr-only">
          {`Answer in your own words: ${question.question}`}
        </label>
        <input
          id={`answer-${question.label}`}
          type="text"
          value={custom}
          disabled={disabled}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={40}
          placeholder="Or say it in your own words"
          className="h-11 w-full rounded-full border border-hairline bg-paper pl-4 pr-12 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submitCustom}
          disabled={disabled || custom.trim() === ""}
          aria-label="Use this answer"
          className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-ink text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <CornerDownLeft className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
