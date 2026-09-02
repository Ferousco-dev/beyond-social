"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState, type ReactElement } from "react";

import { signInAction, type SignInState } from "@/lib/auth/actions";
import { Spinner } from "@/components/ui/spinner";

const FIELD_CLASS =
  "h-11 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SignInForm({ redirectTo }: { redirectTo?: string }): ReactElement {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInAction, {
    status: "idle",
  });
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      {state.status === "error" ? (
        // Announced rather than only shown: the error appears after a
        // navigation-free submit, which a screen reader would otherwise miss.
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="you@company.com"
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${FIELD_CLASS} pr-12`}
          />
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {pending ? <Spinner className="size-4" /> : null}
        {pending ? "Signing in" : "Sign in"}
      </button>

      <p className="text-sm text-muted-foreground">
        Access is granted by an existing admin. There is no sign-up and no password reset here.
      </p>
    </form>
  );
}
