import { Lock } from "lucide-react";

import { PLANS, type PlanId } from "@/lib/billing/plans";
import { type CatalogModel } from "@/lib/models/types";
import { cn } from "@/lib/utils";

/** Plans are ordered cheapest first, so their index is their rank. */
function rank(plan: PlanId): number {
  return PLANS.indexOf(plan);
}

/**
 * What the current plan can run, and what it costs to run.
 *
 * Here because tier and balance are separate dials: credits buy runs, a plan
 * decides which models the runs may use. Showing the locked models beside the
 * unlocked ones is what makes that legible, and stops someone topping up for a
 * model their plan will never accept.
 *
 * A list, not a grid of cards. Every row is the same three facts, and rows on a
 * shared baseline are how you compare numbers.
 */
export function ModelAccess({ plan, models }: { plan: PlanId; models: readonly CatalogModel[] }) {
  if (models.length === 0) return null;
  const current = rank(plan);

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">What your plan can run</h2>

      <ul className="mt-4 rounded-xl border border-hairline bg-paper">
        {models.map((model) => {
          const unlocked = rank(model.minPlan) <= current;
          return (
            <li
              key={model.id}
              className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                {!unlocked ? <Lock className="size-3 shrink-0 text-ink-soft" aria-hidden /> : null}
                <span className={cn("truncate text-sm", unlocked ? "text-ink" : "text-ink-soft")}>
                  {model.name}
                </span>
                {!unlocked ? (
                  // Only the plan name is capitalised. `capitalize` on the whole
                  // string rendered "Creator And Up".
                  <span className="shrink-0 text-xs text-ink-soft">
                    <span className="capitalize">{model.minPlan}</span> and up
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                {model.creditCost} {model.creditCost === 1 ? "credit" : "credits"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
