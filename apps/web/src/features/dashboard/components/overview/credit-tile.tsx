import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { dayCount } from "@/lib/dashboard/analytics";

import { type CreditBalance } from "./types";

/** Below this share of the allowance, the balance is worth acting on. */
const LOW_PERCENT = 25;

export function CreditTile({ credits }: { readonly credits: CreditBalance | null }): ReactNode {
  if (!credits || credits.total <= 0) {
    return (
      <div className="rounded-xl border border-hairline bg-paper p-3.5">
        <dt className="text-xs text-ink-soft">Video credits</dt>
        <dd className="mt-1.5 text-sm text-ink-soft">Balance unavailable</dd>
      </div>
    );
  }

  const remaining = Math.max(0, credits.total - credits.used);
  const percent = Math.round((remaining / credits.total) * 100);
  const low = percent <= LOW_PERCENT;

  return (
    <div className="rounded-xl border border-hairline bg-paper p-3.5">
      <dt className="text-xs text-ink-soft">Video credits</dt>
      <dd className="mt-1.5">
        <span className="text-2xl font-semibold tabular-nums leading-none text-ink">
          {remaining}
        </span>
        <span className="text-sm text-ink-soft"> of {credits.total} left</span>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={credits.total}
          aria-valuenow={remaining}
          aria-label="Video credits remaining"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-cloud"
        >
          <div
            style={{ width: `${percent}%` }}
            className={low ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-primary"}
          />
        </div>
        <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-ink-soft">
          Resets in {dayCount(credits.resetsInDays)}
          {low ? (
            <Link
              href={"/dashboard/settings/billing" as Route}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Upgrade
            </Link>
          ) : null}
        </span>
      </dd>
    </div>
  );
}
