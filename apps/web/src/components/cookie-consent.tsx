"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

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

export function CookieConsent(): React.ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === null) setVisible(true);
    } catch {
      // Storage unavailable: say nothing rather than show a banner nobody can dismiss.
    }
  }, []);

  function accept(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Nothing to persist to; the banner still closes for this visit.
    }
    setVisible(false);
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
