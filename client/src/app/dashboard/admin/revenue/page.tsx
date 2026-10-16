import { type Metadata } from "next";
import { type ReactNode } from "react";
import type { z } from "zod";

import { SubscriptionActivity } from "@/features/admin-console/components/subscription-activity";
import { billingOverviewResponse, revenueHistoryResponse, usageResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Revenue" };
export const dynamic = "force-dynamic";

const WINDOWS = [7, 30, 90] as const;
type RevenuePoint = z.infer<typeof revenueHistoryResponse>["data"][number];

function currency(cents: number, code: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase() }).format(cents / 100);
}

function dollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function netCents(point: RevenuePoint): number {
  return point.subscriptionCents + point.packCents - point.refundCents;
}

function RevenueTrend({ points, code, days }: { readonly points: readonly RevenuePoint[]; readonly code: string; readonly days: number }): ReactNode {
  const low = Math.min(0, ...points.map(netCents));
  const high = Math.max(0, ...points.map(netCents));
  const span = high - low || 1;
  const y = (value: number): number => 210 - ((value - low) / span) * 175;
  const x = (index: number): number => 70 + (points.length < 2 ? 0 : (index / (points.length - 1)) * 900);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(netCents(point))}`).join(" ");
  const ticks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].filter((index) => index >= 0);

  if (points.length === 0) return <p className="mt-4 text-sm text-ink-soft">No recorded receipts in this period.</p>;

  return (
    <figure className="mt-4">
      <svg viewBox="0 0 1000 260" role="img" aria-label={`Daily net recorded receipts in ${code.toUpperCase()} for the last ${days} days`} className="aspect-[1000/260] w-full overflow-visible text-primary">
        <line x1="64" x2="980" y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.2" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <circle key={`${point.date}-${point.currency}`} cx={x(index)} cy={y(netCents(point))} r="3.5" fill="currentColor">
            <title>{`${point.date}: ${currency(netCents(point), code)}`}</title>
          </circle>
        ))}
        {ticks.map((index) => (
          <text key={index} x={x(index)} y="246" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fill="currentColor" className="text-ink-soft" fontSize="12">
            {points[index]?.date.slice(5)}
          </text>
        ))}
        <text x="4" y="24" fill="currentColor" className="text-ink-soft" fontSize="12">{currency(high, code)}</text>
        <text x="4" y="210" fill="currentColor" className="text-ink-soft" fontSize="12">{currency(low, code)}</text>
      </svg>
      <figcaption className="mt-2 text-xs text-ink-soft">Daily recorded invoices and paid packs, less fully recorded pack refunds. Zero line shown.</figcaption>
    </figure>
  );
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; currency?: string }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  const days = WINDOWS.find((window) => window === Number(params.days)) ?? 30;
  const [overviewResult, historyResult, usageResult] = await Promise.all([
    goApi("/api/v1/admin/billing", billingOverviewResponse),
    goApi(`/api/v1/admin/billing/history?days=${days}`, revenueHistoryResponse),
    goApi(`/api/v1/admin/credits/usage?days=${days}`, usageResponse),
  ]);
  if (!overviewResult.ok || !historyResult.ok || !usageResult.ok) {
    const message = !overviewResult.ok ? overviewResult.message : !historyResult.ok ? historyResult.message : usageResult.ok ? "Could not load revenue details." : usageResult.message;
    return <p role="alert" className="text-sm text-destructive">{message}</p>;
  }
  const overview = overviewResult.data.data;
  const history = historyResult.data.data;
  const currencies = [...new Set(history.map((point) => point.currency))].sort();
  const code = currencies.includes(params.currency?.toLowerCase() ?? "") ? params.currency!.toLowerCase() : currencies[0] ?? "usd";
  const points = history.filter((point) => point.currency === code);
  const totals = points.reduce((sum, point) => ({
    subscriptions: sum.subscriptions + point.subscriptionCents,
    packs: sum.packs + point.packCents,
    refunds: sum.refunds + point.refundCents,
  }), { subscriptions: 0, packs: 0, refunds: 0 });
  const creditValue = usageResult.data.data.actions.reduce((sum, row) => sum + row.revenueUsd, 0);
  const estimatedCost = usageResult.data.data.actions.reduce((sum, row) => sum + row.estimatedCostUsd, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Revenue</h1>
      <p className="mt-1 text-sm text-ink-soft">Recorded receipts, refunds, and estimated generation costs. Stripe remains the book of record.</p>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="days" className="mb-1 block text-xs font-medium text-ink-soft">Period</label>
          <select id="days" name="days" defaultValue={days} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
            {WINDOWS.map((window) => <option key={window} value={window}>Last {window} days</option>)}
          </select>
        </div>
        {currencies.length > 0 ? (
          <div>
            <label htmlFor="currency" className="mb-1 block text-xs font-medium text-ink-soft">Currency</label>
            <select id="currency" name="currency" defaultValue={code} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
              {currencies.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
            </select>
          </div>
        ) : null}
        <button type="submit" className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Apply</button>
      </form>

      <dl className="mt-6 grid divide-y divide-hairline border-y border-hairline sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="py-4 sm:px-4 sm:first:pl-0"><dt className="text-xs text-ink-soft">Net recorded receipts</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{currency(totals.subscriptions + totals.packs - totals.refunds, code)}</dd></div>
        <div className="py-4 sm:px-4"><dt className="text-xs text-ink-soft">Subscription invoices</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{currency(totals.subscriptions, code)}</dd></div>
        <div className="py-4 sm:px-4"><dt className="text-xs text-ink-soft">Paid credit packs</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{currency(totals.packs, code)}</dd></div>
        <div className="py-4 sm:px-4 sm:last:pr-0"><dt className="text-xs text-ink-soft">Recorded pack refunds</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{currency(totals.refunds, code)}</dd></div>
      </dl>

      <section className="mt-8" aria-labelledby="trend-heading">
        <h2 id="trend-heading" className="text-sm font-semibold text-ink">Recorded receipts over time</h2>
        <RevenueTrend points={points} code={code} days={days} />
        {points.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Daily {code.toUpperCase()} receipts and refunds</caption>
              <thead className="border-b border-hairline text-xs text-ink-soft"><tr><th className="py-2 pr-3 font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Subscriptions</th><th className="px-3 py-2 text-right font-medium">Packs</th><th className="px-3 py-2 text-right font-medium">Refunds</th><th className="py-2 pl-3 text-right font-medium">Net</th></tr></thead>
              <tbody className="divide-y divide-hairline">{points.map((point) => <tr key={`${point.date}-${point.currency}`}><th scope="row" className="py-2 pr-3 font-medium text-ink">{point.date}</th><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{currency(point.subscriptionCents, code)}</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{currency(point.packCents, code)}</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{currency(point.refundCents, code)}</td><td className="py-2 pl-3 text-right tabular-nums text-ink">{currency(netCents(point), code)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="cost-heading">
        <h2 id="cost-heading" className="text-sm font-semibold text-ink">Estimated generation contribution</h2>
        <p className="mt-1 text-sm text-ink-soft">A modeled USD equivalent from credit usage, not cash profit. Provider balance decreases are shown on Pricing and are not added here.</p>
        <dl className="mt-3 grid divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-3 sm:px-4 sm:first:pl-0"><dt className="text-xs text-ink-soft">Credit value</dt><dd className="mt-1 font-semibold tabular-nums text-ink">{dollars(creditValue)}</dd></div>
          <div className="py-3 sm:px-4"><dt className="text-xs text-ink-soft">Estimated action costs</dt><dd className="mt-1 font-semibold tabular-nums text-ink">{dollars(estimatedCost)}</dd></div>
          <div className="py-3 sm:px-4 sm:last:pr-0"><dt className="text-xs text-ink-soft">Modeled contribution</dt><dd className="mt-1 font-semibold tabular-nums text-ink">{dollars(creditValue - estimatedCost)}</dd></div>
        </dl>
      </section>

      <section className="mt-8" aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-sm font-semibold text-ink">Subscription snapshot</h2>
        <p className="mt-1 text-sm text-ink-soft">{overview.active_subscribers} active · {overview.past_due_subscribers} past due · {overview.canceled_subscribers} canceled · {overview.incomplete_subscribers} incomplete · {currency(overview.monthly_recurring_cents, "usd")} current-price monthly estimate</p>
        <p className="mt-1 text-xs text-ink-soft">The table below shows saved lifecycle and invoice events. Older history is not backfilled.</p>
      </section>

      <p className="mt-8 border-t border-hairline pt-4 text-xs leading-relaxed text-ink-soft">
        Refunds include fully refunded credit-pack payments recorded here. Partial pack refunds, subscription refunds, Stripe processing fees, and non-AI operating costs are not available in this report. For reconciled cash figures, use Stripe.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-ink">Subscriptions</h2>
      {overview.subscribers.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No Pro members yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {overview.subscribers.map((s) => (
            <li key={s.email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-ink">{s.email}</span>
              <span className="shrink-0 text-xs text-ink-soft">
                {s.status === "past_due" ? "Payment failed" : s.status === "canceled" ? "Canceled" : s.status === "incomplete" ? "Incomplete" : s.status === "trialing" ? "Trial" : "Active"}
                {s.period_end ? ` · period ends ${s.period_end}` : ""} · updated {s.updated_at}
              </span>
            </li>
          ))}
        </ul>
      )}
      <SubscriptionActivity events={overview.activity} />
    </div>
  );
}
