"use client";

import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

/**
 * The rough concept, before anything is asked about it.
 *
 * Kept as one plain textarea on purpose. This is the step where the user has the
 * least formed thought, so it is the wrong place to put fields, pickers or a
 * required length; everything specific gets asked on the next screen, once there
 * is something to ask about.
 */
export function IdeaInput({
  value,
  onChange,
  onBack,
  onSubmit,
  pending,
}: {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
        <Sparkles className="size-5 text-ink-soft" aria-hidden />
        What is the idea?
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        A sentence is enough. Rough is fine, that is the point.
      </p>

      <label htmlFor="rough-idea" className="sr-only">
        Your idea
      </label>
      <textarea
        id="rough-idea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="A video showing how our sourdough gets made, start to finish, for people who think baking is intimidating"
        className="mt-5 block w-full resize-none rounded-2xl border border-hairline bg-paper px-4 py-3.5 text-base leading-relaxed text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          // The analysis this screen started is still in flight, and this
          // state lives one level up in a component that never unmounts
          // across the flow: leaving now does not cancel it, so its answer
          // would arrive after the user had gone somewhere else and pull
          // them back into a screen they had already left.
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={value.trim().length < 10 || pending}
          className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          Refine this idea
        </button>
      </div>
    </div>
  );
}
