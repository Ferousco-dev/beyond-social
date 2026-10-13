import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { openBillingPortal, startSubscription } from "@/features/billing/actions";
import { formatPrice } from "@/features/billing/format";
import { OverageForm } from "@/features/billing/overage-form";
import { RedirectButton } from "@/features/billing/redirect-button";
import { ResetTime } from "@/features/billing/reset-time";
import { goApi } from "@/lib/go-api/client";
import { plansResponse, usageResponse, type UsageSnapshot } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Usage" };
export const dynamic = "force-dynamic";

function Meter({ label, used, limit, resetsAt }: { label: string; used: number; limit: number; resetsAt: string | null }): ReactNode {
  const share = limit > 0 ? Math.min(used / limit, 1) : 0;
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">{label}</h2>
        <span className="text-sm tabular-nums text-ink-soft">{Math.round(share * 100)}% used</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cloud" role="progressbar" aria-label={label} aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${share >= 1 ? "bg-warning" : "bg-primary"}`} style={{ width: `${share * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {resetsAt ? (
          <>
            Refills <ResetTime at={resetsAt} />
          </>
        ) : (
          "Starts when you next use the app."
        )}
      </p>
    </div>
  );
}

function ProView({ usage, balance }: { usage: UsageSnapshot; balance: number }): ReactNode {
  return (
    <>
      <div className="mt-6 space-y-3">
        <Meter label="Current session" used={usage.five_hour_used} limit={usage.five_hour_limit} resetsAt={usage.five_hour_resets_at} />
        <Meter label="This week" used={usage.week_used} limit={usage.week_limit} resetsAt={usage.week_resets_at} />
      </div>
      <p className="mt-3 text-xs text-ink-soft">The session refills five hours after you start using the app. The week refills every Monday at 00:00 UTC. Bigger work, like video, uses more of both than a chat message.</p>

      <h2 className="mt-10 text-sm font-semibold text-ink">Extra usage</h2>
      <div className="mt-2">
        <OverageForm enabled={usage.overage_enabled} cap={usage.overage_cap} used={usage.overage_used} balance={balance} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        Need credits for extra usage?{" "}
        <Link href={"/dashboard/credits" as Route} className="text-ink underline underline-offset-2">
          Buy credits
        </Link>
        .
      </p>

      <div className="mt-8">
        <RedirectButton action={openBillingPortal} variant="outline">
          Manage subscription
        </RedirectButton>
      </div>
    </>
  );
}

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }): Promise<ReactNode> {
  const { upgraded } = await searchParams;
  const [usage, plans] = await Promise.all([goApi("/api/v1/usage", usageResponse), goApi("/api/v1/plans", plansResponse, { anonymous: true })]);
  if (!usage.ok) {
    return (
      <p role="alert" className="mx-auto max-w-2xl px-4 py-10 text-sm text-destructive">
        {usage.message}
      </p>
    );
  }
  const { usage: snapshot, credits } = usage.data.data;
  const price = plans.ok ? formatPrice(plans.data.data.pro_price_cents, "usd") : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Usage</h1>
      <p className="mt-1 text-sm text-ink-soft">{snapshot.plan === "pro" ? "You are on Pro." : "You are on the Free plan."}</p>
      {upgraded ? (
        <p role="status" className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-ink">
          Thank you. Pro starts as soon as the payment is confirmed, which is usually a few seconds. Refresh if you still see the Free plan.
        </p>
      ) : null}

      {snapshot.plan === "pro" ? (
        <ProView usage={snapshot} balance={credits} />
      ) : (
        <div className="mt-6 space-y-4">
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums text-ink">{credits}</span>
            <span className="text-sm text-ink-soft">credits left</span>
          </p>
          <p className="text-sm text-ink-soft">On Free, every action uses credits. Pro replaces them with generous session and weekly limits, removes the watermark and unlocks everything.</p>
          <RedirectButton action={startSubscription} signedOutHref="/login">
            Upgrade to Pro{price ? ` · ${price} a month` : ""}
          </RedirectButton>
        </div>
      )}
    </div>
  );
}
