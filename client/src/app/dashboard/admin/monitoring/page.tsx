import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

import { formatPrice } from "@/features/billing/format";
import { usageResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Monitoring" };
export const dynamic = "force-dynamic";

function money(value: number): string {
  return formatPrice(Math.round(value * 100), "usd");
}

function Metric({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }): ReactNode {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

export default async function AdminMonitoringPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ days?: string }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  const days = params.days === "7" || params.days === "90" ? Number(params.days) : 30;
  const result = await goApi(`/api/v1/admin/credits/usage?days=${days}`, usageResponse);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Monitoring</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Review recorded action usage, provider cost estimates, and open provider alerts. Usage rows do not include every platform operating expense.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Report period">
        {[7, 30, 90].map((period) => (
          <Link
            key={period}
            href={`/dashboard/admin/monitoring?days=${period}` as Route}
            aria-current={days === period ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm ${
              days === period ? "border-primary bg-primary/5 font-medium text-ink" : "border-hairline text-ink-soft hover:bg-cloud"
            }`}
          >
            {period} days
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{result.message}</p>
      ) : (
        <>
          {(() => {
            const revenue = result.data.data.actions.reduce((sum, row) => sum + row.revenueUsd, 0);
            const estimatedCost = result.data.data.actions.reduce((sum, row) => sum + row.estimatedCostUsd, 0);
            return (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label={`Recorded action revenue · ${days} days`} value={money(revenue)} detail="From action charges in the credit report." />
                <Metric label="Estimated provider cost" value={money(estimatedCost)} detail="Estimate based on configured provider costs." />
                <Metric label="Estimated contribution" value={money(revenue - estimatedCost)} detail="Revenue minus estimated provider costs only; not company profit." />
              </div>
            );
          })()}

          <h2 className="mt-8 text-sm font-semibold text-ink">Provider spend reported</h2>
          {result.data.data.providers.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-hairline p-4 text-sm text-ink-soft">
              No provider spend was reported for this period.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
              {result.data.data.providers.map((provider) => (
                <li key={`${provider.provider}:${provider.unit}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span className="text-ink">{provider.provider} <span className="text-xs text-ink-soft">· {provider.unit}</span></span>
                  <span className="font-medium tabular-nums text-ink">{money(provider.spent)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-sm font-semibold text-ink">Usage by action</h2>
          {result.data.data.actions.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-hairline p-4 text-sm text-ink-soft">
              No billable activity was recorded for this period.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-paper">
              <table className="w-full min-w-140 text-left text-sm">
                <thead className="border-b border-hairline text-xs text-ink-soft">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Count</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Credits</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {result.data.data.actions.map((row) => (
                    <tr key={row.action}>
                      <th scope="row" className="px-4 py-3 font-medium text-ink">{row.action}</th>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{row.count.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{row.credits.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{money(row.revenueUsd)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{money(row.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            This report is not a full profit statement: subscription revenue, payment-processing fees, refunds, fixed operating costs, and unrecorded AI costs may be excluded.{" "}
            <Link href="/dashboard/admin/alerts" className="font-medium underline underline-offset-2">Open provider alerts</Link>
            {" "}or{" "}
            <Link href="/dashboard/admin/setup" className="font-medium underline underline-offset-2">review service setup</Link>.
          </p>
        </>
      )}
    </div>
  );
}
