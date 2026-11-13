import { type Metadata } from "next";
import { type ReactNode } from "react";

import { Select } from "@/components/ui/select";
import { actionName } from "@/features/admin-console/action-names";
import { spendResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · AI spend" };
export const dynamic = "force-dynamic";

const WINDOWS = [7, 30, 90] as const;
const RECENT_DAYS = 14;

function dollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function count(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function AdminSpendPage({ searchParams }: { searchParams: Promise<{ days?: string }> }): Promise<ReactNode> {
  const params = await searchParams;
  const days = WINDOWS.find((window) => window === Number(params.days)) ?? 30;
  const result = await goApi(`/api/v1/admin/spend?days=${days}`, spendResponse);
  if (!result.ok) return <p role="alert" className="text-sm text-destructive">{result.message}</p>;

  const { providers, actions, users, daily, models } = result.data.data;
  const totalCost = providers.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
  const totalJobs = providers.reduce((sum, row) => sum + row.jobs, 0);
  const totalTokens = models.reduce((sum, row) => sum + row.inputTokens + row.outputTokens, 0);
  const recent = [...daily].reverse().slice(0, RECENT_DAYS);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">AI spend</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Where generation money went, by job and by person, for every plan. Costs here are estimates from the price table when a job finished. The real provider bill is on the Revenue page.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="days" className="mb-1 block text-xs font-medium text-ink-soft">Period</label>
          <Select id="days" name="days" defaultValue={String(days)} className="w-auto min-w-40" options={WINDOWS.map((window) => ({ value: String(window), label: `Last ${window} days` }))} />
        </div>
        <button type="submit" className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Apply</button>
      </form>

      <dl className="mt-6 grid divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-4 sm:px-4 sm:first:pl-0"><dt className="text-xs text-ink-soft">Estimated provider cost</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{dollars(totalCost)}</dd></div>
        <div className="py-4 sm:px-4"><dt className="text-xs text-ink-soft">Finished jobs</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{count(totalJobs)}</dd></div>
        <div className="py-4 sm:px-4 sm:last:pr-0"><dt className="text-xs text-ink-soft">Gemini tokens</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{count(totalTokens)}</dd></div>
      </dl>

      <section className="mt-8" aria-labelledby="provider-heading">
        <h2 id="provider-heading" className="text-sm font-semibold text-ink">By provider</h2>
        {providers.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No finished jobs recorded in this period. Recording started with this release, so older work is not included.</p>
        ) : (
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {providers.map((row) => (
              <li key={row.provider} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="capitalize text-ink">{row.provider}</span>
                <span className="tabular-nums text-ink-soft">{count(row.jobs)} jobs · about {dollars(row.estimatedCostUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actions.length > 0 ? (
        <section className="mt-8" aria-labelledby="action-heading">
          <h2 id="action-heading" className="text-sm font-semibold text-ink">By action</h2>
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {actions.map((row) => (
              <li key={`${row.provider}-${row.action}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-ink">{actionName(row.action)}</span>
                <span className="tabular-nums text-ink-soft">{count(row.jobs)} jobs · {count(row.units)} units · about {dollars(row.estimatedCostUsd)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {users.length > 0 ? (
        <section className="mt-8" aria-labelledby="user-heading">
          <h2 id="user-heading" className="text-sm font-semibold text-ink">Highest-cost people</h2>
          <p className="mt-1 text-xs text-ink-soft">Includes Pro members, who spend no credits. Top ten for the period.</p>
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {users.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 truncate text-ink">{row.email}</span>
                <span className="shrink-0 tabular-nums text-ink-soft">{count(row.jobs)} jobs · about {dollars(row.estimatedCostUsd)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="model-heading">
        <h2 id="model-heading" className="text-sm font-semibold text-ink">AI model tokens</h2>
        {models.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No model calls recorded in this period.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="sr-only">Model calls and tokens</caption>
              <thead className="border-b border-hairline text-xs text-ink-soft"><tr><th className="py-2 pr-3 font-medium">Model</th><th className="px-3 py-2 text-right font-medium">Calls</th><th className="px-3 py-2 text-right font-medium">Input tokens</th><th className="py-2 pl-3 text-right font-medium">Output tokens</th></tr></thead>
              <tbody className="divide-y divide-hairline">
                {models.map((row) => (
                  <tr key={`${row.provider}-${row.model}`}><th scope="row" className="py-2 pr-3 font-medium text-ink">{row.model}</th><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{count(row.calls)}</td><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{count(row.inputTokens)}</td><td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{count(row.outputTokens)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="mt-8" aria-labelledby="daily-heading">
          <h2 id="daily-heading" className="text-sm font-semibold text-ink">Last {RECENT_DAYS} days with activity</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <caption className="sr-only">Daily estimated cost and tokens</caption>
              <thead className="border-b border-hairline text-xs text-ink-soft"><tr><th className="py-2 pr-3 font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Estimated cost</th><th className="py-2 pl-3 text-right font-medium">Tokens</th></tr></thead>
              <tbody className="divide-y divide-hairline">
                {recent.map((row) => (
                  <tr key={row.date}><th scope="row" className="py-2 pr-3 font-medium text-ink">{row.date}</th><td className="px-3 py-2 text-right tabular-nums text-ink-soft">{dollars(row.estimatedCostUsd)}</td><td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{count(row.tokens)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
