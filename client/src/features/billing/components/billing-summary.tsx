import { type Plan, priceLabel } from "@/lib/billing/plans";
import { type CatalogModel } from "@/lib/models/types";

import { ManageBillingButton } from "./manage-billing-button";

/**
 * The two facts the page exists to state: what you are on, and what you have
 * left.
 *
 * Not two cards. They were, and a card each gave them the same weight as the
 * top-up packs and the ledger below, so the page opened with four bordered
 * boxes and no answer to "what am I looking at". A page can have one header,
 * and this is it: large type on the page's own background, one rule under it.
 */
export function BillingSummary({
  plan,
  balance,
  cheapest,
  portalReady,
}: {
  plan: Plan;
  balance: number;
  /** The cheapest runnable model, used to say what the balance actually buys. */
  cheapest: CatalogModel | null;
  /** False until Stripe exists, when there is no portal to open. */
  portalReady: boolean;
}) {
  const price = priceLabel(plan);
  const runs =
    cheapest !== null && cheapest.creditCost > 0 ? Math.floor(balance / cheapest.creditCost) : null;

  return (
    <section className="border-b border-hairline pb-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <Fact
          label="Plan"
          value={plan.name}
          // A paid plan with no price says nothing rather than "$0", which is
          // the difference between not priced yet and free.
          detail={price !== null && plan.priceUsd > 0 ? `${price} a month` : plan.description}
        />

        <Fact
          label="Credits"
          value={balance.toLocaleString()}
          detail={
            runs !== null && cheapest !== null
              ? `About ${runs.toLocaleString()} ${runs === 1 ? "run" : "runs"} of ${cheapest.name}. Credits never expire.`
              : "Credits never expire."
          }
        />

        {portalReady && plan.id !== "free" ? <ManageBillingButton /> : null}
      </div>
    </section>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-48">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}
