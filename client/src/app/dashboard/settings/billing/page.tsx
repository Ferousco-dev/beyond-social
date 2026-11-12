import { type Metadata } from "next";

import { openBillingPortal, startSubscription } from "@/features/billing/actions";
import { CreditHistory } from "@/features/billing/credit-history";
import { PackCard } from "@/features/billing/pack-card";
import { formatPrice } from "@/features/billing/format";
import { RedirectButton } from "@/features/billing/redirect-button";
import { Receipts } from "@/features/billing/receipts";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { creditsResponse, packsResponse, paymentsResponse, plansResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Plan and billing" };
export const dynamic = "force-dynamic";

export default async function BillingSettingsPage({ searchParams }: { searchParams: Promise<{ paid?: string; cancelled?: string }> }) {
  const { paid, cancelled } = await searchParams;
  const [user, plans, payments, credits, packs] = await Promise.all([
    getCurrentUser(),
    goApi("/api/v1/plans", plansResponse, { anonymous: true }),
    goApi("/api/v1/credits/payments", paymentsResponse),
    goApi("/api/v1/credits", creditsResponse),
    goApi("/api/v1/packs", packsResponse),
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
            ? "Everything is unlocked. A usage limit refills every five hours and every Monday. You can cancel any time from Manage subscription."
            : `Every action uses credits.${price ? ` Pro is ${price} a month.` : ""}`}
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          {pro ? (
            <RedirectButton action={openBillingPortal} variant="outline">
              Manage subscription
            </RedirectButton>
          ) : (
            <RedirectButton action={startSubscription}>Upgrade to Pro</RedirectButton>
          )}
          {/* <Link href={"/dashboard/usage" as Route} className="inline-flex h-11 items-center text-sm text-ink underline underline-offset-2">
            {pro ? "See your usage" : "See your credits"}
          </Link> */}
        </div>
      </div>

      {paid ? (
        <p role="status" className="rounded-lg border border-hairline bg-paper p-3 text-sm text-ink">
          Thank you. Your credits are added as soon as the payment is confirmed, usually within a few seconds. Refresh if the balance has not moved.
        </p>
      ) : null}
      {cancelled ? <p className="text-sm text-ink-soft">The payment was cancelled. You have not been charged.</p> : null}

      <div>
        <h2 className="text-sm font-semibold text-ink">Credits</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {user.credits === null ? "Your balance is not available right now." : `${user.credits} credits left.`} Credits are returned if something fails, and they do not expire.
        </p>
      </div>

      {pro && packs.ok && packs.data.data.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {packs.data.data.map((pack, index, all) => (
            <PackCard key={pack.id} pack={pack} highlighted={all.length > 1 && index === 1} />
          ))}
        </ul>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-ink">Purchases</h2>
        {payments.ok ? (
          <Receipts payments={payments.data.data} />
        ) : (
          <p role="alert" className="mt-2 text-sm text-destructive">
            We couldn&apos;t load your purchases. Your credits and past payments are safe. Refresh the page to try again.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink">Credit history</h2>
        {credits.ok ? <CreditHistory history={credits.data.data.history} /> : <p className="mt-2 text-sm text-destructive">{credits.message}</p>}
      </div>
    </section>
  );
}
