import { ChevronRight } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type Credits } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

/** At or below this many credits the balance is worth acting on. */
const LOW_BALANCE = 10;

/**
 * Credit balance, at rest in the sidebar: the one number that decides whether
 * the next search or video can run, kept on screen while someone works.
 */
export function SidebarUsageCard({ credits }: { credits: Credits }): ReactNode {
  const low = credits.balance <= LOW_BALANCE;

  return (
    <div className="mx-2 mb-3 rounded-2xl border border-hairline bg-canvas p-4">
      <p className="text-xs font-medium text-ink-soft">Credits</p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            low ? "text-warning" : "text-primary",
          )}
        >
          {credits.balance}
        </span>
        <span className="text-sm text-ink-soft">available</span>
      </p>

      <Link
        href={"/dashboard/settings/usage" as Route}
        className="mt-3 flex h-9 items-center justify-between rounded-xl bg-cloud px-3 text-sm font-medium text-ink transition-colors hover:bg-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Credit history
        <ChevronRight className="size-4 text-ink-soft" aria-hidden />
      </Link>
    </div>
  );
}
