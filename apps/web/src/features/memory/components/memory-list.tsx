"use client";

import { Brain, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { type MemoryLibrary, type RememberedFact } from "@/lib/memory/library";
import { cn } from "@/lib/utils";

import { forgetEverything, forgetFact } from "../actions";

/**
 * What the product remembers, in plain sentences.
 *
 * The claims are shown exactly as they are stored rather than summarised. A
 * paraphrase would hide the wording that is actually reaching the model, which
 * is the one thing somebody comes to this page to see.
 */

/** Kinds read as words rather than as the enum they are stored as. */
const KIND_LABELS: Readonly<Record<string, string>> = {
  preference: "Preference",
  fact: "Fact",
  style: "Style",
  goal: "Goal",
};

export function MemoryList({ library }: { library: MemoryLibrary }) {
  const { confirm, dialog } = useConfirm();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = library.live.length + library.retired.length;

  function forget(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await forgetFact({ id });
      if (!result.ok) setMessage(result.message);
    });
  }

  async function clearAll() {
    const agreed = await confirm({
      title: "Forget everything?",
      description:
        "Every one of these is deleted for good. Nothing else in your account changes, and the app keeps working; it just starts over knowing nothing about you.",
      confirmLabel: "Forget everything",
    });
    if (!agreed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await forgetEverything();
      if (!result.ok) setMessage(result.message);
    });
  }

  if (total === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
        <Brain className="mx-auto size-6 text-ink-soft" aria-hidden />
        <p className="mt-3 text-sm font-medium text-ink">Nothing remembered yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
          As you work, standing preferences and facts about what you make get noted here, so you do
          not have to repeat them. Passing details of one video are not kept.
        </p>
      </div>
    );
  }

  return (
    <>
      {dialog}

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">
            Known about you
            <span className="ml-2 text-xs font-normal tabular-nums text-ink-soft">
              {library.live.length}
            </span>
          </h2>

          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-xs font-medium text-ink-soft transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Forget everything
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {library.live.map((fact) => (
            <FactRow key={fact.id} fact={fact} onForget={forget} disabled={pending} />
          ))}
        </ul>
      </section>

      {library.retired.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">No longer used</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Replaced by something you said later. Kept because it explains why the app changed what
            it was doing.
          </p>
          <ul className="mt-3 space-y-2">
            {library.retired.map((fact) => (
              <FactRow key={fact.id} fact={fact} onForget={forget} disabled={pending} retired />
            ))}
          </ul>
        </section>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </>
  );
}

function FactRow({
  fact,
  onForget,
  disabled,
  retired = false,
}: {
  fact: RememberedFact;
  onForget: (id: string) => void;
  disabled: boolean;
  retired?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-hairline bg-paper p-4",
        retired && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm text-ink", retired && "line-through")}>{fact.fact}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {KIND_LABELS[fact.kind] ?? fact.kind}
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          {/* Use count is the honest measure of whether a memory earns its place;
              importance is what the extractor guessed at the time. */}
          {fact.useCount === 0
            ? "not used yet"
            : `used ${fact.useCount} ${fact.useCount === 1 ? "time" : "times"}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onForget(fact.id)}
        disabled={disabled}
        aria-label={`Forget: ${fact.fact}`}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}
