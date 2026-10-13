import { type Metadata } from "next";
import { type ReactNode } from "react";

import { formatPrice } from "@/features/billing/format";
import { billingOverviewResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Revenue" };
export const dynamic = "force-dynamic";

function Stat({ label, value, note }: { label: string; value: string; note?: string }): ReactNode {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {note ? <p className="mt-1 text-xs text-ink-soft">{note}</p> : null}
    </div>
  );
}

export default async function AdminRevenuePage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/billing", billingOverviewResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const o = result.data.data;
  const revenue = o.subscription_revenue_cents + o.pack_revenue_cents;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Revenue</h1>
      <p className="mt-1 text-sm text-ink-soft">The last 30 days, from payments and invoices recorded here. Stripe remains the book of record.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Revenue" value={formatPrice(revenue, "usd")} note={`${formatPrice(o.subscription_revenue_cents, "usd")} subscriptions, ${formatPrice(o.pack_revenue_cents, "usd")} packs`} />
        <Stat label="Pro members" value={String(o.active_subscribers)} note={o.past_due_subscribers > 0 ? `${o.past_due_subscribers} with a failed payment` : undefined} />
        <Stat label="Monthly recurring" value={formatPrice(o.monthly_recurring_cents, "usd")} note="Members times the current price" />
        <Stat label="Packs sold" value={String(o.packs_sold)} />
        <Stat label="Credits spent" value={o.credits_spent.toLocaleString("en-US")} note="Net of refunds, Free plan and extra usage" />
        <Stat label="Usage points" value={o.usage_points.toLocaleString("en-US")} note="Pro, against the limits" />
      </div>
      <p className="mt-3 text-xs text-ink-soft">Compare revenue with what the providers charged on the Alerts page and in each provider&apos;s dashboard, then adjust prices and limits on the Pricing page.</p>

      <h2 className="mt-10 text-sm font-semibold text-ink">Members</h2>
      {o.subscribers.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No Pro members yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {o.subscribers.map((s) => (
            <li key={s.email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-ink">{s.email}</span>
              <span className="shrink-0 text-xs text-ink-soft">
                {s.status === "past_due" ? "Payment failed" : "Active"}
                {s.period_end ? ` · renews ${s.period_end}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
