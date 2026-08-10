"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { type IdeaAnalysis } from "@/lib/brief/schema";

import { QuestionTurn } from "./question-turn";

/**
 * The questions between a rough idea and a brief, asked as a conversation.
 *
 * One at a time, not a form. The whole product is a chat, and a page of fields
 * in the middle of it reads as a different application; asking in turn also
 * means each question can be read in the light of the last answer rather than
 * competing with three others for attention.
 *
 * The analysis comes first and unprompted, so the user can see they were
 * understood before answering anything. Getting the topic wrong is worth knowing
 * here, not after three questions and a brief about the wrong video.
 */
export function IdeaRefiner({
  analysis,
  answers,
  onAnswer,
  onBack,
  onSubmit,
  pending,
}: {
  analysis: IdeaAnalysis;
  answers: Readonly<Record<string, string>>;
  onAnswer: (label: string, option: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const answered = analysis.questions.filter((question) => answers[question.label]).length;
  const complete = answered === analysis.questions.length;

  // Only the answered questions and the next one. Showing the rest would turn
  // this back into a form that happens to be asked in order.
  const visible = analysis.questions.slice(0, Math.min(answered + 1, analysis.questions.length));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [answered, complete]);

  return (
    <div className="mx-auto w-full max-w-2xl">
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

      <p className="mt-3 text-xs text-ink-soft">
        {complete
          ? "That is everything I needed."
          : `A couple of questions, then I will write the brief. ${answered} of ${analysis.questions.length} answered.`}
      </p>

      {/* `aria-live` so the next question is announced as it appears, rather
          than silently replacing the one just answered. */}
      <div aria-live="polite" className="mt-6 space-y-7">
        {visible.map((question) => (
          <QuestionTurn
            key={question.label}
            question={question}
            answer={answers[question.label]}
            onAnswer={(value) => onAnswer(question.label, value)}
            disabled={pending}
          />
        ))}
      </div>

      <div ref={endRef} />

      <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Edit idea
        </button>

        {complete ? (
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
        ) : null}
      </div>
    </div>
  );
}
