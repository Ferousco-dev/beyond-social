"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one confirmation dialog in the product.
 *
 * It is deliberately dumb: it owns no decision, only the presentation of one.
 * Callers reach it through `useConfirm`, which turns it into a promise.
 *
 * Two rules are enforced here rather than left to each caller, because a rule
 * that every caller has to remember is a rule the product will eventually break:
 * the confirm button never takes initial focus, and a destructive confirm is not
 * clickable for a moment after the dialog opens.
 */

export type ConfirmTone = "destructive" | "neutral";

export interface ConfirmOptions {
  /** What is about to happen, phrased as a question. */
  readonly title: string;
  /** What it does to their data, and whether it can be undone. */
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /** "destructive" arms the confirm button late and colours it as a warning. */
  readonly tone?: ConfirmTone;
}

/**
 * How long a destructive confirm stays inert after the dialog opens.
 *
 * Long enough that the pointer press which opened the dialog cannot land on the
 * confirm button underneath it, and that a person who is double-clicking their
 * way through a menu does not delete something on the second click. Short enough
 * that someone who meant it does not notice.
 */
const ARM_DELAY_MS = 400;

export function ConfirmDialog({
  open,
  options,
  pending = false,
  onResolve,
}: {
  readonly open: boolean;
  readonly options: ConfirmOptions | null;
  readonly pending?: boolean;
  readonly onResolve: (confirmed: boolean) => void;
}): ReactNode {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [armed, setArmed] = useState(false);

  const destructive = options?.tone === "destructive";

  useEffect(() => {
    if (!open || !destructive) {
      setArmed(!destructive);
      return;
    }
    setArmed(false);
    const timer = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [open, destructive]);

  if (!options) return null;

  const titleId = "confirm-dialog-title";
  const descriptionId = "confirm-dialog-description";

  return (
    <Dialog.Root
      open={open}
      // Escape and the overlay both route through here, so both cancel rather
      // than leaving the promise hanging.
      onOpenChange={(next) => {
        if (!next && !pending) onResolve(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          // Focus lands on cancel, so a return key pressed out of impatience
          // dismisses the dialog instead of carrying out the action.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-hairline bg-paper p-6 shadow-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title id={titleId} className="text-base font-medium text-ink">
            {options.title}
          </Dialog.Title>
          <Dialog.Description
            id={descriptionId}
            className="mt-2 text-sm leading-relaxed text-ink-soft"
          >
            {options.description}
          </Dialog.Description>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              disabled={pending}
              onClick={() => onResolve(false)}
              className={buttonVariants({ variant: "outline" })}
            >
              {options.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              disabled={pending || !armed}
              onClick={() => onResolve(true)}
              className={cn(
                buttonVariants({ variant: destructive ? "destructive" : "default" }),
                !armed && "opacity-60",
              )}
            >
              {options.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
