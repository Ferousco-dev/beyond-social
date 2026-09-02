"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { PLAN_CATALOGUE, isPriced, type Plan, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

import { startCheckout } from "../actions";
import { Spinner } from "@/components/ui/spinner";

const UPGRADEABLE: readonly PlanId[] = ["creator", "studio"];

/**
 * The upgrade prompt behind the header's "Upgrade" button.
 *
 * A focused two-plan choice rather than the full billing page: someone who
 * clicked "Upgrade" already knows they want more, they just need to pick
 * between the two plans that give it to them. The full comparison, credit
 * packs, and transaction history stay on the billing page for when they want
 * the whole picture.
 */
export function UpgradeModal({
  open,
  onOpenChange,
  currentPlan,
  checkoutReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanId;
  /** False until Stripe keys exist; passed from the server. */
  checkoutReady: boolean;
}): ReactNode {
  const [isMonthly, setIsMonthly] = useState(true);
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
      setMessage(
        result.status === "unconfigured"
          ? "Billing is not connected yet."
          : "We could not start checkout. You were not charged and your plan is unchanged.",
      );
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-paper p-6 shadow-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-8"
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </Dialog.Close>

          <div className="text-center">
            <Dialog.Title className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Upgrade your plan
            </Dialog.Title>
            <p className="mt-2 text-sm text-ink-soft">
              More videos, more scheduling, more of the engine. Cancel anytime.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", isMonthly ? "text-ink" : "text-ink-soft")}>
              Monthly
            </span>
            <Switch checked={!isMonthly} onCheckedChange={(checked) => setIsMonthly(!checked)} />
            <span className={cn("text-sm font-medium", isMonthly ? "text-ink-soft" : "text-ink")}>
              Annual <span className="text-primary">(save 20%)</span>
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {UPGRADEABLE.map((id) => (
              <PlanCard
                key={id}
                plan={PLAN_CATALOGUE[id]}
                isMonthly={isMonthly}
                current={currentPlan === id}
                busy={busyPlan === id && pending}
                disabled={pending || !checkoutReady || currentPlan === id}
                onUpgrade={() => upgrade(id)}
              />
            ))}
          </div>

          {!checkoutReady ? (
            <p className="mt-5 text-center text-xs text-ink-soft">
              Billing is not connected yet, so nothing here can charge you.
            </p>
          ) : message ? (
            <p role="status" className="mt-5 text-center text-xs text-ink-soft">
              {message}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PlanCard({
  plan,
  isMonthly,
  current,
  busy,
  disabled,
  onUpgrade,
}: {
  plan: Plan;
  isMonthly: boolean;
  current: boolean;
  busy: boolean;
  disabled: boolean;
  onUpgrade: () => void;
}): ReactNode {
  const price = isMonthly ? plan.priceUsd : plan.yearlyPriceUsd;
  const priced = isPriced(plan);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-5 text-left",
        plan.featured ? "border-primary bg-canvas" : "border-hairline bg-paper",
      )}
    >
      {plan.featured ? (
        <span className="absolute -top-2.5 right-5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          Popular
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
        {current ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Current plan
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex min-h-9 items-baseline gap-1">
        {priced ? (
          <>
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-ink">
              ${price}
            </span>
            <span className="text-xs text-ink-soft">/month</span>
          </>
        ) : (
          <span className="text-base font-medium text-ink-soft">Coming soon</span>
        )}
      </p>

      <p className="mt-1 text-xs tabular-nums text-ink-soft">{plan.credits} videos a month</p>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
            <Check className="mt-0.5 size-3 shrink-0 text-ink" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={disabled}
        className={cn(
          "mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40",
          plan.featured ? "bg-primary text-primary-foreground" : "bg-ink text-canvas",
        )}
      >
        {busy ? <Spinner className="size-3.5" /> : null}
        {current ? "Current plan" : `Get ${plan.name}`}
      </button>
    </div>
  );
}
