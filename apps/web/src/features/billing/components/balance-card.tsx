import { Infinity as InfinityIcon } from "lucide-react";

import { type CatalogModel } from "@/lib/models/types";

/**
 * The balance, stated plainly.
 *
 * No progress bar and no "x of y used": credits carry over and can be topped
 * up, so there is no denominator to be a fraction of. A bar would imply a
 * monthly quota that runs out, which is the opposite of how this works.
 */
export function BalanceCard({
  balance,
  cheapest,
}: {
  balance: number;
  /** The cheapest runnable model, used to say what the balance actually buys. */
  cheapest: CatalogModel | null;
}) {
  const runs =
    cheapest !== null && cheapest.creditCost > 0 ? Math.floor(balance / cheapest.creditCost) : null;

  return (
    <div className="rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">Credit balance</h2>
      <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-ink">
        {balance.toLocaleString()}
        <span className="ml-2 text-base font-normal text-ink-soft">credits</span>
      </p>

      {runs !== null && cheapest !== null ? (
        <p className="mt-2 text-xs text-ink-soft">
          Around {runs.toLocaleString()} {runs === 1 ? "run" : "runs"} of {cheapest.name}, at{" "}
          {cheapest.creditCost} {cheapest.creditCost === 1 ? "credit" : "credits"} each.
        </p>
      ) : null}

      <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cloud px-3 py-1.5 text-xs text-ink-soft">
        <InfinityIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
        Credits never expire. Unused credits stay on your account.
      </p>
    </div>
  );
}
