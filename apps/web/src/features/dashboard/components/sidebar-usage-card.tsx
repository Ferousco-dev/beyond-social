import { ChevronRight } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type Credits } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

/** Below this share of the allowance, the bar and the number turn to warning. */
const LOW_PERCENT = 25;

/** `credits.resetsInDays` is a duration, not a date; the card needs the date. */
function resetDate(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Credit balance, at rest in the sidebar.
 *
 * The overview page already has a credit tile, but that is a screen someone
 * visits to check the whole account, not the one they are on when a render
 * runs low. This is the same balance, surfaced where the decision to upgrade
 * actually gets made: mid-session, next to the account switcher.
 */
export function SidebarUsageCard({ credits }: { credits: Credits }): ReactNode {
  const remaining = Math.max(0, credits.total - credits.used);
  const percent = credits.total > 0 ? Math.round((remaining / credits.total) * 100) : 0;
  const low = percent <= LOW_PERCENT;

  return (
    <div className="mx-2 mb-3 rounded-2xl border border-hairline bg-canvas p-4">
      <p className="text-xs font-medium text-ink-soft">Video credits</p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            low ? "text-warning" : "text-primary",
          )}
        >
          {percent}%
        </span>
        <span className="text-sm text-ink-soft">remaining</span>
      </p>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Video credits remaining"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline"
      >
        <div
          style={{ width: `${percent}%` }}
          className={cn("h-full rounded-full", low ? "bg-warning" : "bg-primary")}
        />
      </div>

      <p className="mt-2.5 text-xs text-ink-soft">Resets {resetDate(credits.resetsInDays)}</p>

      <Link
        href={"/dashboard/settings/usage" as Route}
        className="mt-3 flex h-9 items-center justify-between rounded-xl bg-cloud px-3 text-sm font-medium text-ink transition-colors hover:bg-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Usage history
        <ChevronRight className="size-4 text-ink-soft" aria-hidden />
      </Link>
    </div>
  );
}
