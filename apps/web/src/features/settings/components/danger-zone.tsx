"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { DELETION_GRACE_PERIOD_DAYS } from "@/lib/account/types";

import { deleteAccount } from "../deletion-actions";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldId = useId();
  const matches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <section
      aria-labelledby={`${fieldId}-heading`}
      className="mt-10 border-t border-hairline pt-10"
    >
      <div className="rounded-xl border border-destructive/40 bg-paper p-5">
        <h2 id={`${fieldId}-heading`} className="text-sm font-semibold text-destructive">
          Delete account
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Your access ends immediately. Everything you have made is kept for{" "}
          {DELETION_GRACE_PERIOD_DAYS} days, and an administrator can restore your account within
          that window. After {DELETION_GRACE_PERIOD_DAYS} days it may be permanently removed, and
          that cannot be undone.
        </p>

        {open ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await deleteAccount({
                  confirmEmail,
                  reason: reason.trim() === "" ? undefined : reason,
                });
                if (result.status === "error") {
                  setError(result.message);
                  return;
                }
                router.replace("/account-deleted");
              });
            }}
            className="mt-5"
          >
            <div>
              <label htmlFor={`${fieldId}-email`} className="block text-xs font-medium text-ink">
                Type <span className="font-semibold">{email}</span> to confirm
              </label>
              <input
                id={`${fieldId}-email`}
                type="text"
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                required
                aria-describedby={error ? `${fieldId}-error` : undefined}
                className={FIELD}
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor={`${fieldId}-reason`}
                className="block text-xs font-medium text-ink-soft"
              >
                Why are you leaving? (optional)
              </label>
              <textarea
                id={`${fieldId}-reason`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={500}
                className={`${FIELD} resize-y`}
              />
            </div>

            {error ? (
              <p id={`${fieldId}-error`} role="alert" className="mt-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending || !matches}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-destructive px-4 text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Delete my account
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmEmail("");
                  setError(null);
                }}
                disabled={pending}
                className="inline-flex h-11 items-center rounded-full border border-hairline px-4 text-xs font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 inline-flex h-11 items-center rounded-full border border-destructive/50 px-4 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            Delete account
          </button>
        )}
      </div>
    </section>
  );
}
