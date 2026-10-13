"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

import { type CheckoutResult } from "./actions";

interface Props extends Pick<ButtonProps, "variant" | "size" | "className"> {
  readonly action: () => Promise<CheckoutResult>;
  readonly children: ReactNode;
  /** Where to send someone who is not signed in, instead of calling the action. */
  readonly signedOutHref?: string;
}

/** A button that asks the server for a Stripe page and goes there. */
export function RedirectButton({ action, children, signedOutHref, ...rest }: Props): ReactNode {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (): void =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.ok) window.location.assign(result.url);
      else if (signedOutHref && result.message.toLowerCase().includes("sign in")) window.location.assign(signedOutHref);
      else setError(result.message);
    });

  return (
    <div>
      <Button {...rest} disabled={pending} onClick={go}>
        {pending ? "Opening" : children}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
