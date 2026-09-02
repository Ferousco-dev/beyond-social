"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { updatePassword } from "../actions";
import { Spinner } from "@/components/ui/spinner";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Referenced by both fields, so the outcome is announced with either of them. */
const MESSAGE_ID = "password-form-message";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // Kept apart from the message, because "your password was changed" and "those
  // do not match" were both rendered identically and announced identically.
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setFailed(false);
        startTransition(async () => {
          const result = await updatePassword({ password, confirm });
          setMessage(result.message);
          setFailed(result.status !== "ok");
          if (result.status === "ok") {
            setPassword("");
            setConfirm("");
          }
        });
      }}
      className="mt-4 rounded-xl border border-hairline bg-paper p-5"
    >
      <h2 className="text-sm font-semibold text-ink">Password</h2>
      <p className="mt-1 text-xs text-ink-soft">
        You stay signed in on this device. Other devices keep their session until it expires.
      </p>

      <div className="mt-4">
        <label htmlFor="new-password" className="block text-xs font-medium text-ink-soft">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          // Both fields point at the same message, because the failure is about
          // the pair: too short, or the two not matching. A screen reader hears
          // why rather than a bare "Change password" that did nothing.
          aria-invalid={failed || undefined}
          aria-describedby={message ? MESSAGE_ID : undefined}
          className={FIELD}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="confirm-password" className="block text-xs font-medium text-ink-soft">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
          aria-invalid={failed || undefined}
          aria-describedby={message ? MESSAGE_ID : undefined}
          className={FIELD}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || password === "" || confirm === ""}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Spinner className="size-3.5" /> : null}
          Change password
        </button>
        {message ? (
          <p
            id={MESSAGE_ID}
            // `alert` for a failure so it interrupts, `status` for a success so
            // it does not. Both were `status`, so a rejected password change
            // was announced as politely as a successful one.
            role={failed ? "alert" : "status"}
            className={cn("text-xs", failed ? "text-destructive" : "text-ink-soft")}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
