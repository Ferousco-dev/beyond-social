"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Which words to make the video from: the person's own, or the version our AI
 * wrote, which they can edit first. It opens as soon as they send, so their own
 * prompt can be chosen while the other one is still being written.
 */
export function PromptChoiceDialog({
  open,
  prompt,
  suggestion,
  loading,
  note,
  onUse,
  onClose,
}: {
  open: boolean;
  prompt: string;
  /** The improved prompt, or null while it is written or when it could not be. */
  suggestion: string | null;
  loading: boolean;
  /** Why there is no improved prompt, when writing one failed. */
  note: string | null;
  onUse: (text: string) => void;
  onClose: () => void;
}): ReactNode {
  const [draft, setDraft] = useState(suggestion ?? "");
  useEffect(() => setDraft(suggestion ?? ""), [suggestion]);

  const improved = draft.trim();

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-hairline bg-paper shadow-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <Dialog.Title className="text-base font-medium text-ink">Choose your prompt</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-soft">
                {loading
                  ? "Our AI is rewriting it to look more like real footage. You can keep yours without waiting."
                  : suggestion !== null
                    ? "Our AI rewrote it to look more like real footage. Use it, edit it, or keep yours."
                    : "Go ahead with your own words."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="mt-5 flex min-h-0 flex-col gap-4 overflow-y-auto px-6">
            <section aria-labelledby="choice-improved">
              <h3 id="choice-improved" className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <Sparkles className="size-3.5 text-primary" aria-hidden /> Improved
              </h3>
              {loading ? (
                <div className="mt-2 space-y-2 rounded-lg border border-hairline p-3" aria-label="Improving your prompt" role="status">
                  <div className="h-3 w-full animate-pulse rounded bg-cloud" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-cloud" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-cloud" />
                </div>
              ) : suggestion !== null ? (
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={3000}
                  rows={5}
                  aria-label="Improved prompt, which you can edit"
                  className="mt-2 block w-full resize-none rounded-lg border border-hairline bg-transparent p-3 text-sm leading-6 text-ink outline-none transition-colors focus:border-ink/25 field-sizing-content"
                />
              ) : (
                <p className="mt-2 rounded-lg border border-dashed border-hairline p-3 text-sm text-ink-soft">{note}</p>
              )}
            </section>

            <section aria-labelledby="choice-yours">
              <h3 id="choice-yours" className="text-xs font-medium text-ink-soft">
                Yours
              </h3>
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-cloud/70 p-3 text-sm leading-6 text-ink-soft">{prompt}</p>
            </section>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => onUse(prompt.trim())} className={cn(buttonVariants({ variant: "outline" }), "rounded-lg")}>
              Use mine
            </button>
            <button
              type="button"
              disabled={loading || suggestion === null || improved === ""}
              onClick={() => onUse(improved)}
              className={cn(buttonVariants({ variant: "default" }), "rounded-lg")}
            >
              Use improved
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
