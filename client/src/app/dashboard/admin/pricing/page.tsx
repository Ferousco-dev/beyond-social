import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PriceForm } from "@/features/admin-console/components/price-form";
import { SettingForm } from "@/features/admin-console/components/setting-form";
import { CREDIT_USD, SETTING_GROUPS } from "@/features/admin-console/pricing-config";
import { pricesResponse, settingsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Pricing" };

export default async function AdminPricingPage(): Promise<ReactNode> {
  const [prices, settings] = await Promise.all([
    goApi("/api/v1/admin/credits/prices", pricesResponse),
    goApi("/api/v1/admin/credits/settings", settingsResponse),
  ]);

  const rows = settings.ok ? settings.data.data : [];
  const listed = new Set(SETTING_GROUPS.flatMap((group) => group.keys));
  const groups = [
    ...SETTING_GROUPS.map((group) => ({ title: group.title, items: rows.filter((row) => group.keys.includes(row.key)) })),
    { title: "Other", items: rows.filter((row) => !listed.has(row.key)) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Pricing</h1>
        <p className="mt-1 text-sm text-ink-soft">
          People pay in credits. One credit is worth ${CREDIT_USD.toFixed(2)}. Set how many credits each action costs, and each row shows what you keep after the provider is paid.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-ink">What each action costs</h2>
        <p className="mt-1 text-xs text-ink-soft">The provider cost is an estimate until it is checked against a real bill. Real spend is on the Revenue page.</p>
        {prices.ok ? (
          <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {prices.data.data.filter((price) => price.provider !== "heygen").map((price) => (
              <PriceForm key={price.action} price={price} />
            ))}
          </ul>
        ) : (
          <p role="alert" className="mt-2 text-sm text-destructive">{prices.message}</p>
        )}
      </section>

      {!settings.ok ? <p role="alert" className="text-sm text-destructive">{settings.message}</p> : null}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-ink">{group.title}</h2>
          <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {group.items.map((setting) => (
              <SettingForm key={setting.key} setting={setting} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
