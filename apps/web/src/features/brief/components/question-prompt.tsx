"use client";

import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { type PickerQuestion } from "@/lib/brief/schema";
import { cn } from "@/lib/utils";

/**
 * One question, asked as a prompt docked over the page.
 *
 * Numbered options with arrow keys, Enter to take one and Escape to skip, so it
 * can be answered without the mouse ever moving. The last row is always a text
 * field: the options are guesses about what somebody might want, and a guess
 * that cannot be argued with is a form field wearing a chat bubble.
 *
 * Skipping is a real answer and is offered plainly. A question the user has no
 * opinion about is better left to the brief than answered at random, and a
 * prompt with no way out is a modal that lies about being dismissible.
 */

/** The custom-answer row sits after the options, as the last stop in the ring. */
const CUSTOM = -1;

export function QuestionPrompt({
  question,
  index,
  total,
  onAnswer,
  onSkip,
  disabled,
}: {
  question: PickerQuestion;
  index: number;
  total: number;
  onAnswer: (value: string) => void;
  onSkip: () => void;
  disabled: boolean;
}) {
  const [active, setActive] = useState(0);
  const [custom, setCustom] = useState("");
  const customRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus moves to the card so the key handling below receives the keystrokes
  // without the page needing a global listener.
  useEffect(() => {
    cardRef.current?.focus();
    setActive(0);
    setCustom("");
  }, [question.label]);

  function commit(value: string) {
    const answer = value.trim();
    if (answer === "" || disabled) return;
    onAnswer(answer);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onSkip();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const stops = [...question.options.map((_, position) => position), CUSTOM];
      const at = stops.indexOf(active);
      const next = event.key === "ArrowDown" ? at + 1 : at - 1;
      // Wraps, so holding an arrow never dead-ends at either edge.
      const target = stops[(next + stops.length) % stops.length] ?? 0;

      setActive(target);
      if (target === CUSTOM) customRef.current?.focus();
      else customRef.current?.blur();
      return;
    }

    // A digit picks its option directly, which is what the numbers are for.
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= question.options.length) {
      if (document.activeElement === customRef.current) return;
      event.preventDefault();
      commit(question.options[digit - 1] ?? "");
      return;
    }

    if (event.key === "Enter" && active !== CUSTOM) {
      event.preventDefault();
      commit(question.options[active] ?? "");
    }
  }

  return (
    <div
      // The whole card is the keyboard surface, so arrows work wherever the
      // pointer happens to be. `tabIndex={-1}` makes it focusable without
      // putting it in the tab ring, where it would be a stop that does nothing.
      ref={cardRef}
      tabIndex={-1}
      role="group"
      aria-label={question.question}
      onKeyDown={handleKeyDown}
      className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card outline-none"
    >
      <div className="flex items-start gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {question.label}
            <span className="ml-2 tabular-nums normal-case tracking-normal">
              {index + 1} of {total}
            </span>
          </p>
          <h2 className="mt-1.5 text-lg font-semibold leading-snug text-ink">
            {question.question}
          </h2>
        </div>

        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip this question"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <ul className="border-t border-hairline">
        {question.options.map((option, position) => (
          <li key={option} className="border-b border-hairline">
            <button
              type="button"
              disabled={disabled}
              onMouseEnter={() => setActive(position)}
              onClick={() => commit(option)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active === position ? "bg-cloud" : "hover:bg-cloud",
              )}
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cloud text-sm font-medium tabular-nums text-ink-soft">
                {position + 1}
              </span>
              <span className="min-w-0 flex-1 text-base font-semibold text-ink">{option}</span>
            </button>
          </li>
        ))}

        <li className={cn("border-b border-hairline", active === CUSTOM && "bg-cloud")}>
          <div className="flex items-center gap-4 px-5">
            <Pencil className="size-4 shrink-0 text-ink-soft" aria-hidden />
            <label htmlFor={`custom-${question.label}`} className="sr-only">
              Answer in your own words
            </label>
            <input
              ref={customRef}
              id={`custom-${question.label}`}
              type="text"
              value={custom}
              disabled={disabled}
              maxLength={40}
              onFocus={() => setActive(CUSTOM)}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                commit(custom);
              }}
              placeholder="Something else"
              className="h-14 w-full bg-transparent text-base text-ink placeholder:text-ink-soft focus:outline-none disabled:opacity-50"
            />
          </div>
        </li>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        {/* Hidden on touch, where none of these keys exist to press. */}
        <p className="hidden text-xs text-ink-soft sm:block">
          <span aria-hidden>↑↓</span> to navigate <span className="mx-1.5">·</span> Enter to select{" "}
          <span className="mx-1.5">·</span> Esc to skip
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="ml-auto inline-flex h-10 cursor-pointer items-center rounded-lg border border-hairline px-5 text-sm font-semibold text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
