import { Check, Lock } from "lucide-react";

import { PLANS, type Plan, type PlanId, priceLabel } from "@/lib/billing/plans";
import { type CatalogModel } from "@/lib/models/types";
import { cn } from "@/lib/utils";

/** Plans are ordered cheapest first, so their index is their rank. */
function rank(plan: PlanId): number {
  return PLANS.indexOf(plan);
}

/**
 * What the current plan is and what it includes.
 *
 * The model list is here because tier and price are separate dials: a balance
 * buys runs, a plan decides which models the runs may use. Showing the locked
 * models alongside the unlocked ones is what makes that legible, and stops
 * someone buying credits for a model their plan will never accept.
 */
export function PlanSummary({ plan, models }: { plan: Plan; models: readonly CatalogModel[] }) {
  const current = rank(plan.id);

  return (
    <div className="rounded-xl border border-hairline bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Your plan</h2>
          <p className="mt-1 text-2xl font-semibold text-ink">{plan.name}</p>
        </div>
        {plan.priceUsd > 0 ? (
          <p className="text-sm tabular-nums text-ink-soft">{priceLabel(plan)} / month</p>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-ink-soft">{plan.description}</p>

      <ul className="mt-4 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-xs text-ink-soft">
            <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      {models.length > 0 ? (
        <div className="mt-5 border-t border-hairline pt-4">
          <h3 className="text-xs font-semibold text-ink">Models this plan unlocks</h3>
          <ul className="mt-2 space-y-2">
            {models.map((model) => {
              const unlocked = rank(model.minPlan) <= current;
              return (
                <li key={model.id} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-baseline gap-2">
                    {unlocked ? (
                      <Check className="size-3 shrink-0 self-center text-primary" aria-hidden />
                    ) : (
                      <Lock className="size-3 shrink-0 self-center text-ink-soft" aria-hidden />
                    )}
                    <span className={cn("truncate", unlocked ? "text-ink" : "text-ink-soft")}>
                      {model.name}
                    </span>
                    {!unlocked ? (
                      <span className="shrink-0 capitalize text-ink-soft">
                        ({model.minPlan} and up)
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-soft">
                    {model.creditCost} {model.creditCost === 1 ? "credit" : "credits"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
