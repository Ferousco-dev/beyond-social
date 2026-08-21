"use client";

import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";

import { type IdeaAnalysis } from "@/lib/brief/schema";
import { cn } from "@/lib/utils";

import { QuestionPrompt } from "./question-prompt";

/**
 * The questions between a rough idea and a brief.
 *
 * The analysis sits on the page and the current question is docked over it, one
 * at a time. Reading back what was understood is the part that has to stay
 * visible: getting the topic wrong is worth catching here, not after three
 * questions and a brief about the wrong video.
 *
 * Skipped questions are left out of the brief rather than guessed at. A user who
 * has no opinion about hook style is better served by the writer choosing than
 * by being made to invent a preference.
 */
export function IdeaRefiner({
  analysis,
  answers,
  skipped,
  onAnswer,
  onSkip,
  onBack,
  onSubmit,
  pending,
}: {
  analysis: IdeaAnalysis;
  answers: Readonly<Record<string, string>>;
  skipped: ReadonlySet<string>;
  onAnswer: (label: string, option: string) => void;
  onSkip: (label: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const settled = analysis.questions.filter(
    (question) => answers[question.label] !== undefined || skipped.has(question.label),
  ).length;

  const current = analysis.questions.find(
    (question) => answers[question.label] === undefined && !skipped.has(question.label),
  );

  return (
    <div className="mx-auto w-full max-w-2xl pb-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        <Sparkles className="size-5 text-ink-soft" aria-hidden />
        Let me get this right
      </h1>

      <dl className="mt-5 rounded-2xl rounded-tl-md bg-cloud p-5 text-sm">
        {[
          { term: "Topic", value: analysis.topic },
          { term: "Audience", value: analysis.audience },
          { term: "Angle", value: analysis.angle },
        ].map((row) => (
          <div key={row.term} className="flex gap-4 py-1.5">
            <dt className="w-20 shrink-0 font-medium text-ink-soft">{row.term}</dt>
            <dd className="min-w-0 flex-1 text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <ol className="mt-6 space-y-3">
        {analysis.questions.map((question) => {
          const answer = answers[question.label];
          const wasSkipped = skipped.has(question.label);
          if (answer === undefined && !wasSkipped) return null;

          return (
            <li key={question.label} className="flex items-start gap-3">
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  wasSkipped ? "text-ink-soft/50" : "text-primary",
                )}
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-sm">
                <span className="text-ink-soft">{question.label}: </span>
                <span className={cn(wasSkipped ? "text-ink-soft italic" : "text-ink")}>
                  {wasSkipped ? "your call" : answer}
                </span>
              </p>
            </li>
          );
        })}
      </ol>

      {current ? (
        // Docked rather than inline, so the question is the thing on screen while
        // the analysis it refers to stays readable behind it.
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4">
          <div className="pointer-events-none w-full max-w-2xl">
            <QuestionPrompt
              key={current.label}
              question={current}
              index={settled}
              total={analysis.questions.length}
              onAnswer={(value) => onAnswer(current.label, value)}
              onSkip={() => onSkip(current.label)}
              disabled={pending}
            />
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            // The same reason the idea screen's own Back is guarded: a brief is
            // still being written in a component that outlives this screen, and
            // leaving now would let it land on whatever the user has since
            // navigated to instead of being cancelled.
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Edit idea
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Write the brief
          </button>
        </div>
      )}
    </div>
  );
}
