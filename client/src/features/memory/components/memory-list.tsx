"use client";

import { Brain, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";
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

  /*
   * Two lists rather than one, because they are rendered in separate sections
   * and a single list would have to be re-split on every optimistic change.
   * Both act immediately and roll back together if the server refuses.
   */
  const live = useOptimisticList(library.live);
  const retired = useOptimisticList(library.retired);

  const total = live.items.length + retired.items.length;
  const message = live.error ?? retired.error;

  function forget(fact: RememberedFact) {
    const list = fact.supersededAt === null ? live : retired;
    void list.remove(fact, () => forgetFact({ id: fact.id }));
  }

  async function clearAll() {
    const agreed = await confirm({
      title: "Forget everything?",
      description:
        "Every one of these is deleted for good. Nothing else in your account changes, and the app keeps working; it just starts over knowing nothing about you.",
      confirmLabel: "Forget everything",
    });
    if (!agreed) return;

    // One request, both lists. Clearing them separately would fire two deletes
    // and could leave half the page emptied if the second one failed.
    const outcome = forgetEverything();
    await Promise.all([live.clear(() => outcome), retired.clear(() => outcome)]);
  }

  if (total === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon={Brain}
        title="Nothing remembered yet"
        body="As you work, standing preferences and facts about what you make get noted here, so you do not have to repeat them. Passing details of one video are not kept."
      />
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
              {live.items.length}
            </span>
          </h2>

          <button
            type="button"
            onClick={() => void clearAll()}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-xs font-medium text-ink-soft transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Forget everything
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {live.items.map((fact) => (
            <FactRow key={fact.id} fact={fact} onForget={forget} />
          ))}
        </ul>
      </section>

      {retired.items.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">No longer used</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Replaced by something you said later. Kept because it explains why the app changed what
            it was doing.
          </p>
          <ul className="mt-3 space-y-2">
            {retired.items.map((fact) => (
              <FactRow key={fact.id} fact={fact} onForget={forget} retired />
            ))}
          </ul>
        </section>
      ) : null}

      {message ? (
        <p role="alert" className="mt-4 text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </>
  );
}

function FactRow({
  fact,
  onForget,
  retired = false,
}: {
  fact: RememberedFact;
  onForget: (fact: RememberedFact) => void;
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

      {/* No disabled state and no spinner. The row is gone the moment this is
          pressed, so there is nothing left to show progress on. */}
      <button
        type="button"
        onClick={() => onForget(fact)}
        aria-label={`Forget: ${fact.fact}`}
        className="inline-flex size-8 shrink-0 cursor-pointer pointer-coarse:size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}
