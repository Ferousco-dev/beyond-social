"use client";

import { useActionState, type ReactNode } from "react";

import { clearSecretAction, type SecretActionState } from "../actions";
import { type ManagedSecret } from "../types";

/**
 * Marks a secret as not set.
 *
 * This changes the registry, not the deployment, so the label says "mark" and
 * not "revoke". Revoking happens at the provider, and a console that implied
 * otherwise would be the reason someone stopped rotating a leaked key.
 */
export function ClearForm({ secret }: { secret: ManagedSecret }): ReactNode {
  const [state, formAction, pending] = useActionState<SecretActionState, FormData>(
    clearSecretAction,
    { status: "idle" },
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="key" value={secret.key} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-hairline px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Marking" : "Mark as not set"}
      </button>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="text-sm text-ink-soft">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
