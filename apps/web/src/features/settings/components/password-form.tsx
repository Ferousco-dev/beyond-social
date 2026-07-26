"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { updatePassword } from "../actions";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updatePassword({ password, confirm });
          setMessage(result.message);
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
          className={FIELD}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || password === "" || confirm === ""}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Change password
        </button>
        {message ? (
          <p role="status" className="text-xs text-ink-soft">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
