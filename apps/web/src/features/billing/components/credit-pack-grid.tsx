import { cn } from "@/lib/utils";

import { CREDIT_PACKS, savingPercent } from "../credit-packs";

/**
 * Top-up packs.
 *
 * Every control here is inert on purpose. Stripe is not connected and no pack
 * has a price, so a live-looking Buy button would fail on click; a disabled one
 * that says why is the honest control. Card details are never collected in this
 * app either way: when checkout exists it happens on Stripe's hosted page.
 */
export function CreditPackGrid({ checkoutReady }: { checkoutReady: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">Buy credits</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Credits are the only currency, and they never expire. Larger packs cost less per credit.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CREDIT_PACKS.map((pack) => {
          const saving = savingPercent(pack);
          const purchasable = checkoutReady && pack.priceUsd !== null;

          return (
            <article
              key={pack.id}
              className={cn(
                "flex flex-col rounded-xl border bg-paper p-5",
                pack.featured ? "border-primary" : "border-hairline",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{pack.name}</h3>
                {saving !== null ? (
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-[11px] font-medium text-ink">
                    Save {saving}%
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
                {pack.credits.toLocaleString()}
                <span className="ml-1.5 text-xs font-normal text-ink-soft">credits</span>
              </p>

              {/* No placeholder price. A number here that we do not charge is a
                  lie the customer would reasonably act on. */}
              <p className="mt-1 text-xs tabular-nums text-ink-soft">
                {pack.priceUsd !== null ? `$${pack.priceUsd}` : "Price not set yet"}
              </p>

              <p className="mt-2 flex-1 text-xs text-ink-soft">{pack.description}</p>

              <button
                type="button"
                disabled={!purchasable}
                aria-disabled={!purchasable}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {purchasable ? `Buy ${pack.name}` : "Checkout not connected"}
              </button>
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        Credit packs cannot be bought yet: checkout is not connected and pack prices are not set.
        Nothing on this page can charge you. When it is connected, payment happens on Stripe&apos;s
        hosted page and this app never sees a card number.
      </p>
    </section>
  );
}
