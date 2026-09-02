"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

import { PLAN_LIST, priceLabel, type Plan, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

import { startCheckout } from "../actions";
import { Spinner } from "@/components/ui/spinner";

/**
 * The plans, as one comparison.
 *
 * There used to be two surfaces here: a card describing the plan you are on,
 * and a separate panel offering the two you are not, each listing the same
 * features in the same words. Which meant the page said "everything in Creator"
 * twice and never once let you compare the three. One row, current plan marked,
 * is the shape this information has.
 */
const UPGRADEABLE: readonly PlanId[] = ["creator", "studio"];

export function PlanPicker({
  currentPlan,
  checkoutReady,
}: {
  currentPlan: string;
  /** False until the Stripe keys exist; passed from the server. */
  checkoutReady: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const upgrade = (plan: PlanId): void => {
    setMessage(null);
    setBusyPlan(plan);
    startTransition(async () => {
      const result = await startCheckout({ plan: plan as "creator" | "studio" });
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
          : "We could not start checkout. You were not charged and your plan is unchanged.",
      );
    });
  };

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink">Plans</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-paper">
        <div className="grid sm:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <PlanColumn
              key={plan.id}
              plan={plan}
              current={currentPlan === plan.id}
              busy={busyPlan === plan.id && pending}
              // Only a paid plan is bought, and only when there is a checkout
              // to buy it through.
              onUpgrade={
                checkoutReady && UPGRADEABLE.includes(plan.id) && currentPlan !== plan.id
                  ? () => upgrade(plan.id)
                  : undefined
              }
              disabled={pending}
            />
          ))}
        </div>
      </div>

      {!checkoutReady ? (
        <p className="mt-3 text-xs text-ink-soft">
          Plans cannot be changed here yet: checkout is not connected, so nothing on this page can
          charge you. When it is, payment happens on Stripe&apos;s hosted page and this app never
          sees a card number.
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

function PlanColumn({
  plan,
  current,
  busy,
  onUpgrade,
  disabled,
}: {
  plan: Plan;
  current: boolean;
  busy: boolean;
  onUpgrade?: () => void;
  disabled: boolean;
}) {
  const price = priceLabel(plan);

  return (
    <div
      className={cn(
        "flex flex-col border-hairline p-5 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r",
        current && "bg-canvas",
      )}
    >
      <div className="flex h-5 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
        {current ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Current
          </span>
        ) : null}
      </div>

      <p className="mt-3 flex min-h-8 items-baseline gap-1">
        {price !== null ? (
          <>
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-ink">
              {price}
            </span>
            {plan.priceUsd > 0 ? <span className="text-xs text-ink-soft">/month</span> : null}
          </>
        ) : (
          <span className="text-sm text-ink-soft">Pricing announced soon</span>
        )}
      </p>

      {/*
       * Credits, said as credits. This line read "{plan.credits} videos a
       * month", which was true only while one credit was one video and has
       * been wrong since credits were rebased to five cents of provider cost.
       * The video count lives in the feature list, priced against the model
       * that plan actually runs.
       */}
      <p className="mt-2 text-xs tabular-nums text-ink">
        {plan.credits.toLocaleString()} credits a month
      </p>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
            <Check className="mt-0.5 size-3 shrink-0 text-ink" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      {onUpgrade !== undefined ? (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={disabled}
          className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner className="size-3.5" /> : null}
          Upgrade to {plan.name}
        </button>
      ) : (
        // The column keeps its height whether or not it has an action, so the
        // three feature lists stay on one baseline.
        <span aria-hidden className="mt-5 block h-9" />
      )}
    </div>
  );
}
