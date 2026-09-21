import { type Metadata } from "next";

import { ProviderCreditRow } from "@/features/admin/components/provider-credit-row";
import { getProviderCreditAccounts } from "@/lib/dashboard/admin/provider-credits";

export const metadata: Metadata = { title: "Admin · Provider credits" };

export default async function ProviderCreditsPage() {
  const accounts = await getProviderCreditAccounts();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Provider credits</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Record prepaid balances and expiry dates. These values are operational reminders, not live
        provider balances. The overview warns when an expiry enters its configured window.
      </p>

      <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {accounts.map((account) => (
          <ProviderCreditRow key={account.key} account={account} />
        ))}
      </ul>
    </div>
  );
}
