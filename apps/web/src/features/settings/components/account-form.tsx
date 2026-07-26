"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { updateProfile } from "../actions";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccountForm({ email, fullName }: { email: string; fullName: string }) {
  const [name, setName] = useState(fullName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await updateProfile({ fullName: name });
          setMessage(result.message);
        });
      }}
      className="rounded-xl border border-hairline bg-paper p-5"
    >
      <h2 className="text-sm font-semibold text-ink">Profile</h2>

      <div className="mt-4">
        <label htmlFor="account-email" className="block text-xs font-medium text-ink-soft">
          Email
        </label>
        <input
          id="account-email"
          type="email"
          value={email}
          readOnly
          disabled
          className={`${FIELD} cursor-not-allowed opacity-60`}
        />
        <p className="mt-1 text-xs text-ink-soft">
          Changing your email needs a confirmation from both addresses. Contact support and we will
          move it for you.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="account-name" className="block text-xs font-medium text-ink-soft">
          Name
        </label>
        <input
          id="account-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="name"
          placeholder="How your name appears in the app"
          className={FIELD}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || name.trim() === fullName.trim() || name.trim() === ""}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Save
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
