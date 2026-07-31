import { Coins } from "lucide-react";
import { type Metadata } from "next";

import { ModelMarket } from "@/features/models/components/model-market";
import { getMarketData } from "@/features/models/queries";
import { PLAN_CATALOGUE } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Models" };
export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const { models, plan, balance } = await getMarketData();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Models</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Every model this platform can run, with what a single run costs. Credits never expire,
            and you are only charged when a run succeeds.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-hairline bg-paper px-3.5 py-2 text-sm">
          <Coins className="size-4 text-ink-soft" aria-hidden />
          <span className="font-medium tabular-nums text-ink">{balance}</span>
          <span className="text-ink-soft">credits</span>
          <span className="text-hairline" aria-hidden>
            |
          </span>
          <span className="text-ink-soft">{PLAN_CATALOGUE[plan].name} plan</span>
        </div>
      </div>

      <ModelMarket models={models} />
    </div>
  );
}
