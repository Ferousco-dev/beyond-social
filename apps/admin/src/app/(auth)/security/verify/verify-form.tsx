"use client";

import { useActionState, type ReactElement } from "react";

import { verifyFactorAction, type VerifyState } from "@/lib/auth/mfa-actions";
import { Spinner } from "@/components/ui/spinner";

const FIELD_CLASS =
  "h-11 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function VerifyForm(): ReactElement {
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(verifyFactorAction, {
    status: "idle",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium">
          Code from the app
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className={FIELD_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {pending ? <Spinner className="size-4" /> : null}
        {pending ? "Checking" : "Continue"}
      </button>
    </form>
  );
}
