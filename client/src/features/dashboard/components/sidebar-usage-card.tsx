import { ChevronRight } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type Credits, type UsageBars } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

/** At or below this many credits the balance is worth acting on. */
const LOW_BALANCE = 10;

const LINK =
  "mt-3 flex h-9 items-center justify-between rounded-xl bg-cloud px-3 text-sm font-medium text-ink transition-colors hover:bg-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Bar({ label, used, limit }: { label: string; used: number; limit: number }): ReactNode {
  const share = limit > 0 ? Math.min(used / limit, 1) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(share * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cloud" role="progressbar" aria-label={label} aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full", share >= 1 ? "bg-warning" : "bg-primary")} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function ProUsage({ usage }: { usage: UsageBars }): ReactNode {
  return (
    <>
      <p className="text-xs font-medium text-ink-soft">Pro usage</p>
      <div className="mt-3 space-y-3">
        <Bar label="Current session" used={usage.fiveHour.used} limit={usage.fiveHour.limit} />
        <Bar label="This week" used={usage.week.used} limit={usage.week.limit} />
      </div>
      <Link href={"/dashboard/usage" as Route} className={LINK}>
        Usage details
        <ChevronRight className="size-4 text-ink-soft" aria-hidden />
      </Link>
    </>
  );
}

function FreeCredits({ balance }: { balance: number }): ReactNode {
  const low = balance <= LOW_BALANCE;
  return (
    <>
      <p className="text-xs font-medium text-ink-soft">Credits</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", low ? "text-warning" : "text-primary")}>{balance}</span>
        <span className="text-sm text-ink-soft">available</span>
      </p>
      <Link href={"/pricing" as Route} className="mt-3 flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Upgrade to Pro
      </Link>
      <Link href={"/dashboard/credits" as Route} className={LINK}>
        Credit history
        <ChevronRight className="size-4 text-ink-soft" aria-hidden />
      </Link>
    </>
  );
}

/**
 * Where someone stands, at rest in the sidebar. A Free member sees their credits
 * and a way to upgrade; a Pro member sees how much of the session and the week is used.
 */
export function SidebarUsageCard({ credits }: { credits: Credits }): ReactNode {
  return (
    <div className="mx-2 mb-3 rounded-2xl border border-hairline bg-canvas p-4">
      {credits.plan === "pro" && credits.usage ? <ProUsage usage={credits.usage} /> : <FreeCredits balance={credits.balance} />}
    </div>
  );
}
