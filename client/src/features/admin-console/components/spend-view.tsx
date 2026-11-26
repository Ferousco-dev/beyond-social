"use client";

import { useState, type ReactNode } from "react";

import { actionName } from "@/features/admin-console/action-names";
import { type spendResponse } from "@/lib/go-api/admin-schemas";
import { cn } from "@/lib/utils";

import { SpendChart } from "./spend-chart";
import { WINDOWS, everyDay, type Window } from "./spend-days";

import type { z } from "zod";

export type SpendData = z.infer<typeof spendResponse>["data"];

function dollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function count(n: number): string {
  return n.toLocaleString("en-US");
}

function Stat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rounded-xl border border-hairline bg-paper px-4 py-3.5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
    </div>
  );
}

/**
 * AI spend for 7, 30 and 90 days. All three arrive with the page, so the
 * period tabs switch on the spot instead of asking the server again.
 */
export function SpendView({ windows, initial }: { windows: Readonly<Record<Window, SpendData>>; initial: Window }): ReactNode {
  const [days, setDays] = useState<Window>(initial);

  function pick(window: Window): void {
    setDays(window);
    // Keep the address in step, so a refresh or a shared link opens the same period.
    history.replaceState(null, "", window === 30 ? "/dashboard/admin/spend" : `/dashboard/admin/spend?days=${window}`);
  }

  const { providers, actions, users, daily, models } = windows[days];
  const totalCost = providers.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
  const totalJobs = providers.reduce((sum, row) => sum + row.jobs, 0);
  const totalTokens = models.reduce((sum, row) => sum + row.inputTokens + row.outputTokens, 0);
  const topProvider = Math.max(...providers.map((row) => row.estimatedCostUsd), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">AI spend</h1>
          <p className="mt-1 text-sm text-ink-soft">Estimated from the price table.</p>
        </div>
        <div role="tablist" aria-label="Period" className="flex rounded-lg border border-hairline bg-paper p-0.5">
          {WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              role="tab"
              aria-selected={window === days}
              onClick={() => pick(window)}
              className={cn("cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors", window === days ? "bg-primary/10 text-primary" : "text-ink-soft hover:text-ink")}
            >
              {window} days
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Provider cost" value={dollars(totalCost)} />
        <Stat label="Finished jobs" value={count(totalJobs)} />
        <Stat label="AI tokens" value={count(totalTokens)} />
      </div>

      <section className="rounded-xl border border-hairline bg-paper p-5" aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="text-sm font-semibold text-ink">Cost per day</h2>
        <div className="mt-8">
          <SpendChart days={everyDay(days, daily)} />
        </div>
      </section>

      <section aria-labelledby="provider-heading">
        <h2 id="provider-heading" className="text-sm font-semibold text-ink">By provider</h2>
        {providers.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No finished jobs in this period.</p>
        ) : (
          <ul className="mt-3 space-y-3 rounded-xl border border-hairline bg-paper p-4">
            {providers.map((row) => (
              <li key={row.provider}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="capitalize text-ink">{row.provider}</span>
                  <span className="tabular-nums text-ink-soft">
                    {count(row.jobs)} jobs · <span className="text-ink">{dollars(row.estimatedCostUsd)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cloud">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${topProvider > 0 ? (row.estimatedCostUsd / topProvider) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actions.length > 0 ? (
        <section aria-labelledby="action-heading">
          <h2 id="action-heading" className="text-sm font-semibold text-ink">By action</h2>
          <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {actions.map((row) => (
              <li key={`${row.provider}-${row.action}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate text-ink">{actionName(row.action)}</span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {count(row.jobs)} jobs · <span className="text-ink">{dollars(row.estimatedCostUsd)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {users.length > 0 ? (
        <section aria-labelledby="user-heading">
          <h2 id="user-heading" className="text-sm font-semibold text-ink">Top people</h2>
          <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {users.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate text-ink">{row.email}</span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {count(row.jobs)} jobs · <span className="text-ink">{dollars(row.estimatedCostUsd)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {models.length > 0 ? (
        <section aria-labelledby="model-heading">
          <h2 id="model-heading" className="text-sm font-semibold text-ink">AI models</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-paper">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="sr-only">Model calls and tokens</caption>
              <thead className="border-b border-hairline bg-cloud/40 text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 text-right font-medium">Calls</th>
                  <th className="px-4 py-2 text-right font-medium">Tokens in</th>
                  <th className="px-4 py-2 text-right font-medium">Tokens out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {models.map((row) => (
                  <tr key={`${row.provider}-${row.model}`}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-ink">{row.model}</th>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{count(row.calls)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{count(row.inputTokens)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{count(row.outputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
