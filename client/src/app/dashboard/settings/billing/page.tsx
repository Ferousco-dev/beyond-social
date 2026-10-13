import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";

import { openBillingPortal, startSubscription } from "@/features/billing/actions";
import { formatPrice } from "@/features/billing/format";
import { RedirectButton } from "@/features/billing/redirect-button";
import { Receipts } from "@/features/billing/receipts";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { paymentsResponse, plansResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Plan and billing" };
export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const [user, plans, payments] = await Promise.all([
    getCurrentUser(),
    goApi("/api/v1/plans", plansResponse, { anonymous: true }),
    goApi("/api/v1/credits/payments", paymentsResponse),
  ]);
  const pro = user.plan === "pro";
  const price = plans.ok ? formatPrice(plans.data.data.pro_price_cents, "usd") : null;

  return (
    <section className="mt-6 space-y-6 lg:mt-8">
      <div className="rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Your plan</h2>
        <p className="mt-3 text-2xl font-semibold text-ink">{pro ? "Pro" : "Free"}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {pro
            ? "Everything is unlocked. A usage limit refills every five hours and every Monday."
            : `Every action uses credits, and exports carry a watermark.${price ? ` Pro is ${price} a month.` : ""}`}
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          {pro ? (
            <RedirectButton action={openBillingPortal} variant="outline">
              Manage subscription
            </RedirectButton>
          ) : (
            <RedirectButton action={startSubscription}>Upgrade to Pro</RedirectButton>
          )}
          <Link href={"/dashboard/usage" as Route} className="inline-flex h-11 items-center text-sm text-ink underline underline-offset-2">
            {pro ? "See your usage" : "See your credits"}
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink">Credits</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {user.credits === null ? "Your balance is not available right now." : `${user.credits} credits left.`}{" "}
          <Link href={"/dashboard/credits" as Route} className="text-ink underline underline-offset-2">
            {pro ? "Buy credits" : "Credit history"}
          </Link>
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink">Purchases</h2>
        <Receipts payments={payments.ok ? payments.data.data : []} />
      </div>
    </section>
  );
}
