import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PriceForm } from "@/features/admin-console/components/price-form";
import { SettingForm } from "@/features/admin-console/components/setting-form";
import { pricesResponse, settingsResponse, usageResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Pricing" };

const usd = (value: number): string => `$${value.toFixed(2)}`;

export default async function AdminPricingPage(): Promise<ReactNode> {
  const [prices, settings, usage] = await Promise.all([
    goApi("/api/v1/admin/credits/prices", pricesResponse),
    goApi("/api/v1/admin/credits/settings", settingsResponse),
    goApi("/api/v1/admin/credits/usage?days=30", usageResponse),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Pricing</h1>
        <p className="mt-1 text-sm text-ink-soft">What each action costs in credits, and the limits around it.</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-ink">Action prices</h2>
        {prices.ok ? (
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {prices.data.data.map((price) => (
              <PriceForm key={price.action} price={price} />
            ))}
          </ul>
        ) : (
          <p role="alert" className="mt-2 text-sm text-destructive">{prices.message}</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Limits and alerts</h2>
        {settings.ok ? (
          <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {settings.data.data.map((setting) => (
              <SettingForm key={setting.key} setting={setting} />
            ))}
          </ul>
        ) : (
          <p role="alert" className="mt-2 text-sm text-destructive">{settings.message}</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Last 30 days</h2>
        {usage.ok ? (
          <>
            <p className="mt-1 text-xs text-ink-soft">
              Revenue is what users were charged after refunds. Provider spend is read from real balance
              changes, so it is what the providers actually took.
            </p>
            <ul className="mt-2 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
              {usage.data.data.actions.map((row) => (
                <li key={row.action} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span className="text-ink">{row.action}</span>
                  <span className="tabular-nums text-ink-soft">
                    {row.count} runs · {row.credits} credits · {usd(row.revenueUsd)} charged · est. cost {usd(row.estimatedCostUsd)}
                  </span>
                </li>
              ))}
              {usage.data.data.providers.map((row) => (
                <li key={row.provider} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span className="text-ink">{row.provider} actual spend</span>
                  <span className="tabular-nums text-ink-soft">
                    {row.unit === "usd" ? usd(row.spent) : `${row.spent} credits`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p role="alert" className="mt-2 text-sm text-destructive">{usage.message}</p>
        )}
      </section>
    </div>
  );
}
