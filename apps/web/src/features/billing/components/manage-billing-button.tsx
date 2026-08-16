"use client";

import { useState, useTransition } from "react";

import { openBillingPortal } from "../actions";

/**
 * The way out to Stripe's portal, which is where receipts, cards, and
 * cancellation live. Split from the summary it sits in so that summary can stay
 * a server component: this is the only part of it that needs an event handler.
 */
export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const open = (): void => {
    setMessage(null);
    startTransition(async () => {
      const result = await openBillingPortal();
      if (result.status === "redirect" && result.url) {
        window.location.href = result.url;
        return;
      }
      setMessage("Could not open the billing portal just now.");
    });
  };

  return (
    <div className="ml-auto text-right">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="rounded-full border border-hairline px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        Manage billing
      </button>
      {message ? (
        <p role="status" className="mt-2 text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </div>
  );
}
