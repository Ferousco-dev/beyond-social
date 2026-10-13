"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteAccount } from "../deletion-actions";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DangerZone({ email, subscribed }: { email: string; subscribed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const matches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <section aria-labelledby={`${id}-heading`} className="mt-10 border-t border-hairline pt-10">
      <div className="rounded-xl border border-destructive/40 bg-paper p-5">
        <h2 id={`${id}-heading`} className="text-sm font-semibold text-destructive">
          Delete account
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          You are signed out at once and can no longer sign in. Your credits and anything you made become unreachable. This cannot be undone.
        </p>
        {subscribed ? <p className="mt-2 text-xs text-ink">Cancel your Pro subscription first, under Plan and billing, so you are not charged again.</p> : null}

        {open ? (
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await deleteAccount({ confirmEmail });
                if (result.status === "error") return setError(result.message);
                router.replace("/account-deleted");
              });
            }}
          >
            <label htmlFor={`${id}-email`} className="block text-xs font-medium text-ink">
              Type <span className="font-semibold">{email}</span> to confirm
            </label>
            <input id={`${id}-email`} type="text" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} autoComplete="off" spellCheck={false} className={FIELD} />
            {error ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button type="submit" variant="destructive" disabled={!matches || pending}>
                {pending ? "Deleting" : "Delete my account"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button className="mt-4" variant="outline" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        )}
      </div>
    </section>
  );
}
