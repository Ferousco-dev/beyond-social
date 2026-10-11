import { type Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getModelPricing } from "@/lib/dashboard/admin";
import { ModelPricingRowItem } from "@/features/admin/components/model-pricing-row";

export const metadata: Metadata = { title: "Admin · Model pricing" };

function PricingSkeleton() {
  return (
    <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/4" />
        </li>
      ))}
    </ul>
  );
}

async function PricingSection() {
  const rows = await getModelPricing();
  const byFamily = new Map<string, typeof rows>();
  for (const row of rows) {
    byFamily.set(row.family, [...(byFamily.get(row.family) ?? []), row]);
  }

  return (
    <div className="mt-6 space-y-8">
      {[...byFamily.entries()].map(([family, familyRows]) => (
        <section key={family}>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {family}
          </h2>
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {familyRows.map((row) => (
              <ModelPricingRowItem key={row.id} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function AdminModelPricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Model pricing</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What each generation actually costs in credits, including inactive models. There is no
        external system this can fall out of sync with, unlike the plan prices on the App config
        page — a wrong number here just means the platform eats a loss or overcharges credits for
        one model.
      </p>

      <Suspense fallback={<PricingSkeleton />}>
        <PricingSection />
      </Suspense>
    </div>
  );
}
