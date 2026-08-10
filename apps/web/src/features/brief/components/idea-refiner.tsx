"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { type IdeaAnalysis } from "@/lib/brief/schema";
import { cn } from "@/lib/utils";

/**
 * The questions between a rough idea and a brief.
 *
 * The analysis is shown first and unprompted, so the user can see they were
 * understood before answering anything. Getting the topic wrong is worth knowing
 * at this point, not after three questions and a brief about the wrong video.
 *
 * Every question must be answered before the brief can be written, because an
 * unanswered one would be decided silently, and quietly choosing on somebody's
 * behalf is the behaviour this whole screen exists to avoid.
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
  const answered = analysis.questions.filter((question) => answers[question.label]).length;
  const complete = answered === analysis.questions.length;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        <Sparkles className="size-5 text-ink-soft" aria-hidden />
        Idea refiner
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Your rough concept, turned into a brief you can shoot.
      </p>

      <dl className="mt-6 rounded-2xl border border-hairline bg-paper p-5 text-sm">
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

      <h2 className="mt-8 text-sm font-semibold text-ink">Quick questions to sharpen your brief</h2>
      <p className="mt-1 text-xs text-ink-soft">
        {answered} of {analysis.questions.length} answered
      </p>

      <ol className="mt-5 space-y-6">
        {analysis.questions.map((question, index) => (
          <li key={question.label}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium tabular-nums text-ink-soft">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {question.label}
                </p>
                <p className="mt-1 text-sm text-ink">{question.question}</p>

                <div
                  role="radiogroup"
                  aria-label={question.question}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {question.options.map((option) => {
                    const active = answers[question.label] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onAnswer(question.label, option)}
                        className={cn(
                          "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors pointer-coarse:min-h-11",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-hairline bg-paper text-ink hover:bg-cloud",
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Edit idea
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!complete || pending}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          Generate content brief
        </button>
      </div>
    </div>
  );
}
