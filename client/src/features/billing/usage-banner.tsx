import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type Credits } from "@/lib/dashboard/data";

import { ResetTime } from "./reset-time";

/** Credits at or below this are worth a warning on the Free plan. */
const LOW_CREDITS = 20;
/** A Pro limit this full is worth a warning. */
const NEAR_LIMIT = 0.9;

const STRIP = "mx-auto mt-2 flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-hairline bg-paper px-4 py-2.5 text-sm text-ink-soft";
const LINK = "font-medium text-ink underline underline-offset-2";

/**
 * A quiet strip across the top, shown only when someone is about to run out: a
 * Free member low on credits, or a Pro member near a limit. It says what will
 * happen and what to do, and is gone the rest of the time.
 */
export function UsageBanner({ credits }: { credits: Credits | null }): ReactNode {
  if (!credits) return null;

  if (credits.plan !== "pro") {
    if (credits.balance > LOW_CREDITS) return null;
    return (
      <div role="status" className={STRIP}>
        <span>{credits.balance === 0 ? "You are out of credits." : `You have ${credits.balance} credits left.`}</span>
        <Link href={"/pricing" as Route} className={LINK}>
          Upgrade to Pro to keep going
        </Link>
      </div>
    );
  }

  const bars = credits.usage;
  if (!bars) return null;
  const week = bars.week.limit > 0 ? bars.week.used / bars.week.limit : 0;
  const session = bars.fiveHour.limit > 0 ? bars.fiveHour.used / bars.fiveHour.limit : 0;
  const worst = week >= session ? { name: "weekly", share: week, resetsAt: bars.week.resetsAt } : { name: "session", share: session, resetsAt: bars.fiveHour.resetsAt };
  if (worst.share < NEAR_LIMIT || !worst.resetsAt) return null;
  return (
    <div role="status" className={STRIP}>
      <span>
        {worst.share >= 1 ? `Your ${worst.name} limit is full.` : `You have used ${Math.round(worst.share * 100)}% of your ${worst.name} limit.`} It refills <ResetTime at={worst.resetsAt} />.
      </span>
      <Link href={"/dashboard/usage" as Route} className={LINK}>
        See usage or turn on extra usage
      </Link>
    </div>
  );
}
