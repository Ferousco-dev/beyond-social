"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useClientValue } from "@/lib/hooks/use-client-value";

/**
 * First-visit cookie notice for the marketing site.
 *
 * Reads and writes a plain localStorage flag rather than a cookie: nothing
 * about the notice itself needs to be readable server-side, and a cookie
 * would be one more thing sent on every request for a value only the browser
 * ever acts on. Silent on a failed read/write (private browsing, blocked
 * storage) rather than erroring the page over a banner.
 */

const STORAGE_KEY = "bs:cookie-consent";

/** Whether this browser has not answered yet. Unreadable storage counts as answered, so no banner sticks. */
function unanswered(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

export function CookieConsent(): React.ReactNode {
  const needed = useClientValue(unanswered, false);
  const [dismissed, setDismissed] = useState(false);
  const visible = needed && !dismissed;

  function accept(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      setDismissed(true);
      return;
    }
    setDismissed(true);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pb-safe sm:px-6"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-3 rounded-2xl border border-hairline bg-paper p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-ink-soft">
          We use cookies to keep you signed in and understand how Beyond Social is used. See our{" "}
          <a href="/privacy" className="font-medium text-ink underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
        <Button onClick={accept} size="sm" className="w-full shrink-0 sm:w-auto">
          Accept
        </Button>
      </div>
    </div>
  );
}
