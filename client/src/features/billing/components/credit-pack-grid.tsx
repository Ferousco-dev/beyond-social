import { cn } from "@/lib/utils";

import { CREDIT_PACKS, savingPercent } from "../credit-packs";

/**
 * Top-up packs.
 *
 * Every control here is inert on purpose. Stripe is not connected and no pack
 * has a price, so a live-looking Buy button would fail on click; a disabled one
 * that says why is the honest control. Card details are never collected in this
 * app either way: when checkout exists it happens on Stripe's hosted page.
 *
 * One container with four columns rather than four cards, matching the plans
 * above it. The page had five separate bordered surfaces stacked down it, which
 * gave a top-up pack the same visual weight as the plan you are on.
 */
export function CreditPackGrid({ checkoutReady }: { checkoutReady: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">Buy credits</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Credits are the only currency, and they never expire. Larger packs cost less per credit.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-paper">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {CREDIT_PACKS.map((pack) => {
            const saving = savingPercent(pack);
            const purchasable = checkoutReady && pack.priceUsd !== null;

            return (
              <article
                key={pack.id}
                className={cn(
                  "flex flex-col border-hairline p-5 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r",
                  pack.featured && "bg-canvas",
                )}
              >
                <div className="flex h-5 items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{pack.name}</h3>
                  {saving !== null ? (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                      Save {saving}%
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {pack.credits.toLocaleString()}
                  <span className="ml-1.5 text-xs font-normal text-ink-soft">credits</span>
                </p>

                {/* No placeholder price. A number here that we do not charge is
                    a lie the customer would reasonably act on. */}
                <p className="mt-1 text-xs tabular-nums text-ink-soft">
                  {pack.priceUsd !== null ? `$${pack.priceUsd}` : "Price announced soon"}
                </p>

                <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-soft">
                  {pack.description}
                </p>

                <button
                  type="button"
                  disabled={!purchasable}
                  aria-disabled={!purchasable}
                  className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-full bg-ink text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {purchasable ? `Buy ${pack.name}` : "Not available yet"}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
