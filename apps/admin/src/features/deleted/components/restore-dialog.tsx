"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { IDLE_RESTORE_ACTION } from "../action-state";
import { restoreAccountAction } from "../actions";
import { formatInstant } from "../format";
import { type DeletedAccount } from "../schema";

import { BUTTON_PRIMARY, BUTTON_QUIET } from "./controls";

/**
 * Restoring one deleted account, behind a dialog that names it.
 *
 * The confirmation exists because this list is worked in bulk and every row
 * looks alike: the one thing an operator must not do is restore the account
 * next to the one they meant. So the dialog repeats the address in full rather
 * than asking "are you sure".
 *
 * Built on the native dialog element, which gives a focus trap, Escape to
 * close, and an inert page behind it without a dialog library.
 */
export function RestoreDialog({ account }: { account: DeletedAccount }): ReactNode {
  const [state, submit, pending] = useActionState(restoreAccountAction, IDLE_RESTORE_ACTION);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = `restore-${account.userId}`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A restore removes the row from the list, so the dialog closes itself and
  // the outcome is reported on the page rather than inside a panel that is
  // about to be replaced.
  useEffect(() => {
    if (state.status === "ok") setOpen(false);
  }, [state.status]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BUTTON_QUIET}>
        Restore
      </button>

      {state.status !== "idle" ? (
        <p
          role="status"
          className={cn(
            "mt-1.5 text-xs",
            state.status === "ok" ? "text-success" : "text-destructive",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === ref.current) setOpen(false);
        }}
        className="m-auto w-[min(30rem,92vw)] rounded-xl border border-hairline bg-paper p-0 text-ink backdrop:bg-black/40"
      >
        <form action={submit} className="space-y-4 p-5">
          <input type="hidden" name="userId" value={account.userId} />

          <div className="space-y-1.5">
            <h2 id={titleId} className="text-sm font-semibold tracking-tight text-ink">
              Restore this account?
            </h2>
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{account.email}</span>, deleted on{" "}
              {formatInstant(account.deletedAt)}.
            </p>
          </div>

          <p className="text-sm text-ink-soft">
            The account can sign in again and everything it made becomes reachable to it. The
            deletion and this restore both stay in the audit log, recorded against you.
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={BUTTON_QUIET}
            >
              Cancel
            </button>
            <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
              {pending ? "Restoring" : "Restore account"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
