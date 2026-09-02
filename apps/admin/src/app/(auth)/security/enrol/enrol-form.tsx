"use client";

import { useActionState, useState, useTransition, type ReactElement } from "react";

import { beginEnrolAction, confirmEnrolAction, type EnrolState } from "@/lib/auth/mfa-actions";
import { Spinner } from "@/components/ui/spinner";

const FIELD_CLASS =
  "h-11 w-full rounded-md border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

function Alert({ message }: { message: string }): ReactElement {
  return (
    // Announced rather than only shown: it appears after a navigation-free
    // submit, which a screen reader would otherwise miss.
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function EnrolForm(): ReactElement {
  const [started, setStarted] = useState<EnrolState>({ status: "idle" });
  const [starting, startEnrol] = useTransition();
  const [state, formAction, pending] = useActionState<EnrolState, FormData>(
    confirmEnrolAction,
    started,
  );

  // The confirm action carries the pending factor forward on a rejected code,
  // so its state wins once it exists.
  const current = state.status === "idle" ? started : state;

  if (current.status !== "pending") {
    return (
      <div className="flex flex-col gap-4">
        {current.status === "error" ? <Alert message={current.message} /> : null}
        <button
          type="button"
          disabled={starting}
          className={BUTTON_CLASS}
          onClick={() => startEnrol(async () => setStarted(await beginEnrolAction()))}
        >
          {starting ? <Spinner className="size-4" /> : null}
          {starting ? "Setting up" : "Set up an authenticator"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={current.factorId} />
      <input type="hidden" name="qrCode" value={current.qrCode} />
      <input type="hidden" name="secret" value={current.secret} />

      {current.message ? <Alert message={current.message} /> : null}

      {/* Supabase returns the QR as an inline SVG data URI, so there is no
          image host involved and nothing to add to the CSP. `next/image` has
          nothing to optimise here and would only add a loader in front of
          bytes that are already in the page. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.qrCode}
        alt="QR code for setting up your authenticator app"
        className="size-48 self-center rounded-md bg-white p-2"
      />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Cannot scan it? Enter this key by hand instead.
        </p>
        <code className="break-all rounded-md border border-hairline bg-paper px-3 py-2 text-xs">
          {current.secret}
        </code>
      </div>

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

      <button type="submit" disabled={pending} className={BUTTON_CLASS}>
        {pending ? <Spinner className="size-4" /> : null}
        {pending ? "Confirming" : "Confirm"}
      </button>
    </form>
  );
}
