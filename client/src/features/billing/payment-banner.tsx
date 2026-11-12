import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

/**
 * Shown while a Pro renewal payment has failed and Stripe is retrying. It says
 * what happened, that access continues for now, and goes straight to the card.
 */
export function PaymentBanner({ failing }: { failing: boolean }): ReactNode {
  if (!failing) return null;
  return (
    <div
      role="status"
      className="mx-auto mt-2 flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-destructive/40 bg-paper px-4 py-2.5 text-sm text-ink"
    >
      <span>Your last payment did not go through. Pro stays on for now while we retry.</span>
      <Link href={"/dashboard/settings/billing" as Route} className="font-medium text-ink underline underline-offset-2">
        Update your card
      </Link>
    </div>
  );
}
