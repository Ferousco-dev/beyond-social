"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, type ReactNode } from "react";

import { rotateSecretAction, type SecretActionState } from "../actions";
import { LOCATION_NOTES, type ManagedSecret } from "../types";

const FIELD =
  "w-full rounded-lg border border-hairline bg-paper px-3 py-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Records a rotation.
 *
 * The value field is write-only in both directions. It is never populated from
 * the server, because the server has nothing to populate it with, and it is
 * cleared the moment the action succeeds so a credential does not sit in a form
 * on an unattended screen.
 */
export function RotateForm({ secret }: { secret: ManagedSecret }): ReactNode {
  const [state, formAction, pending] = useActionState<SecretActionState, FormData>(
    rotateSecretAction,
    { status: "idle" },
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);

  const valueId = `${secret.key}-value`;
  const storeId = `${secret.key}-store`;

  return (
    <form ref={form} action={formAction} className="space-y-3 border-t border-hairline pt-4">
      <input type="hidden" name="key" value={secret.key} />

      <div className="space-y-1.5">
        <label htmlFor={valueId} className="block text-sm font-medium text-ink">
          New value
        </label>
        <input
          id={valueId}
          name="value"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          spellCheck={false}
          placeholder="Paste the value you set at the provider"
          aria-describedby={`${secret.key}-effect`}
          className={FIELD}
        />
        <p id={`${secret.key}-effect`} className="text-xs text-ink-soft">
          {LOCATION_NOTES[secret.location].effect}
        </p>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id={storeId}
          name="storeValue"
          type="checkbox"
          className="mt-0.5 size-4 rounded border-hairline accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <label htmlFor={storeId} className="text-xs text-ink-soft">
          Keep an encrypted copy in Supabase Vault. It is stored for recovery only. Nothing in this
          console can read it back, and leaving this unchecked destroys any copy already held.
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Recording" : "Record rotation"}
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
      </div>
    </form>
  );
}
