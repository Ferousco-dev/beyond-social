"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { PLAN_CATALOGUE } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

import { openBillingPortal, startCheckout } from "../actions";

/** Only the paid plans are purchasable, so the type excludes `free` and the
 * checkout action cannot be called with something it must reject. */
const UPGRADEABLE = ["creator", "studio"] as const;
type UpgradeablePlan = (typeof UPGRADEABLE)[number];

/**
 * Plan chooser. Checkout happens on Stripe's hosted page, so no card details
 * are ever entered into this app.
 *
 * When checkout is not connected the buttons say so and are disabled, rather
 * than looking live and failing on click. A control that cannot do its job
 * should not look like one that can.
 */
export function UpgradePanel({
  currentPlan,
  checkoutReady,
}: {
  currentPlan: string;
  /** False until the Stripe keys exist; passed from the server. */
  checkoutReady: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<UpgradeablePlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const go = (action: () => Promise<{ status: string; url?: string; message?: string }>): void => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "redirect" && result.url) {
        window.location.href = result.url;
        return;
      }
      setBusyPlan(null);
      // The fallback says what did not happen to their money, because that is
      // the question someone asks when a checkout button fails.
      setMessage(
        result.status === "unconfigured"
          ? "Billing is not connected yet."
          : (result.message ??
              "We could not start checkout. You were not charged and your plan is unchanged. Try again in a moment."),
      );
    });
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Plan</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Currently on <span className="capitalize text-ink">{currentPlan}</span>.
          </p>
        </div>
        {currentPlan !== "free" && checkoutReady ? (
          <button
            type="button"
            onClick={() => go(openBillingPortal)}
            disabled={pending}
            className="rounded-full border border-hairline px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            Manage billing
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {UPGRADEABLE.map((id) => {
          const plan = PLAN_CATALOGUE[id];
          const active = currentPlan === id;
          return (
            <article
              key={id}
              className={cn(
                "rounded-xl border bg-paper p-5",
                active ? "border-primary" : "border-hairline",
              )}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
                <p className="text-sm tabular-nums text-ink">
                  ${plan.priceUsd}
                  <span className="text-xs text-ink-soft">/mo</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{plan.description}</p>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs text-ink-soft">
                    <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={active || pending || !checkoutReady}
                title={checkoutReady ? undefined : "Checkout is not connected yet."}
                onClick={() => {
                  setBusyPlan(id);
                  go(() => startCheckout({ plan: id }));
                }}
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-ink text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busyPlan === id && pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                {active
                  ? "Current plan"
                  : checkoutReady
                    ? `Upgrade to ${plan.name}`
                    : "Not available yet"}
              </button>
            </article>
          );
        })}
      </div>

      {!checkoutReady ? (
        <p className="mt-3 text-xs text-ink-soft">
          Paid plans are not purchasable yet: checkout is not connected. Nothing on this page can
          charge you.
        </p>
      ) : null}

      {message ? (
        <p role="status" className="mt-3 text-xs text-ink-soft">
          {message}
        </p>
      ) : null}
    </section>
  );
}
