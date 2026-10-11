import { type Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAppConfig } from "@/lib/dashboard/admin";
import { getPlanCatalogue } from "@/lib/billing/plans-live";
import { PLANS } from "@/lib/billing/plans";
import { ConfigRow } from "@/features/admin/components/config-row";

export const metadata: Metadata = { title: "Admin · App config" };

function ConfigSkeleton() {
  return (
    <div className="mt-6 space-y-8">
      {Array.from({ length: 2 }).map((_, i) => (
        <section key={i}>
          <Skeleton className="h-3 w-24" />
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {Array.from({ length: 4 }).map((_, j) => (
              <li key={j} className="p-4">
                <Skeleton className="h-4 w-1/3" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EffectivePricingSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

/**
 * Resolved plan numbers, after any override in the "billing" area below. Read
 * this, not the raw config rows, to know what a plan's credits and displayed
 * price actually are right now.
 */
async function EffectivePricingSection() {
  const catalogue = await getPlanCatalogue();
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-paper">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs text-ink-soft">
            <th className="px-4 py-2 font-medium">Plan</th>
            <th className="px-4 py-2 font-medium">Credits</th>
            <th className="px-4 py-2 font-medium">Displayed price</th>
          </tr>
        </thead>
        <tbody>
          {PLANS.map((id) => {
            const plan = catalogue[id];
            return (
              <tr key={id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2 text-ink">{plan.name}</td>
                <td className="px-4 py-2 tabular-nums text-ink">{plan.credits.toLocaleString()}</td>
                <td className="px-4 py-2 tabular-nums text-ink">${plan.priceUsd}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ConfigSection() {
  const rows = await getAppConfig();
  const byArea = new Map<string, typeof rows>();
  for (const row of rows) {
    byArea.set(row.area, [...(byArea.get(row.area) ?? []), row]);
  }

  return (
    <div className="mt-6 space-y-8">
      {[...byArea.entries()].map(([area, areaRows]) => (
        <section key={area}>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {area}
          </h2>
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {areaRows.map((row) => (
              <ConfigRow key={row.key} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">App config</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Runtime numbers, not secrets. &ldquo;Immediate&rdquo; values apply on next read;
        &ldquo;redeploy&rdquo; values are only the recorded intent until the consuming code reads
        this table.
      </p>

      <section className="mt-8">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Effective plan pricing
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          What each plan grants and shows right now, after any override in the billing rows below.
        </p>
        <div className="mt-2">
          <Suspense fallback={<EffectivePricingSkeleton />}>
            <EffectivePricingSection />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<ConfigSkeleton />}>
        <ConfigSection />
      </Suspense>
    </div>
  );
}
