import { Coins } from "lucide-react";
import { type Metadata } from "next";
import { z } from "zod";

import { priceName } from "@/features/settings/price-names";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "What things cost" };

const pricesResponse = z.object({
  data: z.array(z.object({ action: z.string(), unit: z.string(), credits: z.number().int() })),
});

const GROUP_ORDER = ["Videos", "Editor", "AI writing", "Discover", "People and voices", "Other"];

/** Every action that uses credits and what it takes from this person, at their plan's rate. */
export default async function CreditPricesPage() {
  const result = await goApi("/api/v1/credits/prices", pricesResponse);
  const rows = result.ok ? result.data.data.map((row) => ({ ...row, ...priceName(row.action) })) : [];
  const groups = GROUP_ORDER.map((group) => ({ group, rows: rows.filter((row) => row.group === group).sort((a, b) => a.name.localeCompare(b.name)) })).filter((g) => g.rows.length > 0);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink">What things cost</h2>
      <p className="mt-1 text-sm text-ink-soft">Everything our AI does uses credits. If something fails, the credits go straight back to you.</p>
      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          The price list could not be loaded. Try again in a moment.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map(({ group, rows: list }) => (
            <section key={group}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">{group}</h3>
              <ul className="divide-y divide-hairline rounded-xl border border-hairline">
                {list.map((row) => (
                  <li key={row.action} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{row.name}</span>
                      <span className="block text-xs text-ink-soft">{row.per}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums text-ink">
                      <Coins className="size-3.5 text-primary" aria-hidden />
                      {row.credits}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
