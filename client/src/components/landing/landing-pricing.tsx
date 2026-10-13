import { Check } from "lucide-react";
import { type ReactNode } from "react";

import { startSubscription } from "@/features/billing/actions";
import { formatPrice, perCredit } from "@/features/billing/format";
import { RedirectButton } from "@/features/billing/redirect-button";
import { buttonVariants } from "@/components/ui/button";
import { goApi } from "@/lib/go-api/client";
import { packsResponse, plansResponse, type PlanInfo } from "@/lib/go-api/schemas";
import { FREE_SIGNUP_CREDITS } from "@/lib/marketing/credits";
import Link from "next/link";

import { SectionHeading } from "./section-heading";

function Feature({ children }: { children: ReactNode }): ReactNode {
  return (
    <li className="flex gap-2 text-sm text-ink-soft">
      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function freeFeatures(plan: PlanInfo | null): string[] {
  const credits = plan?.free_credits || FREE_SIGNUP_CREDITS;
  const avatars = plan?.free_avatars ?? 1;
  const searches = plan?.free_searches_per_day ?? 3;
  const results = plan?.free_search_results ?? 10;
  return [
    `${credits} credits to start`,
    `${avatars} avatar`,
    `${searches} searches a day, ${results} results each`,
    "Every action uses credits",
    "Exports carry a watermark",
  ];
}

/**
 * Pricing: a Free plan paid in credits and a Pro plan paid by the month. The
 * prices and limits are read from the server, so the admin's numbers are what show.
 */
export async function LandingPricing(): Promise<ReactNode> {
  const [plans, packs] = await Promise.all([goApi("/api/v1/plans", plansResponse, { anonymous: true }), goApi("/api/v1/packs", packsResponse, { anonymous: true })]);
  const plan = plans.ok ? plans.data.data : null;
  const list = packs.ok ? packs.data.data : [];
  const price = formatPrice(plan?.pro_price_cents ?? 2000, "usd");

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading eyebrow="Pricing" title="Start free, upgrade when you are ready" description="Try everything on Free. Pro removes the credit counting and the limits that hold Free back." />

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-hairline bg-paper p-7">
            <h3 className="text-base font-semibold text-ink">Free</h3>
            <p className="mt-3 text-4xl font-semibold text-ink">$0</p>
            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures(plan).map((text) => (
                <Feature key={text}>{text}</Feature>
              ))}
            </ul>
            <Link href="/signup" className={`${buttonVariants({ variant: "outline" })} mt-8`}>
              Get started
            </Link>
          </div>

          <div className="flex flex-col rounded-2xl border border-primary bg-paper p-7">
            <h3 className="text-base font-semibold text-ink">Pro</h3>
            <p className="mt-3 text-4xl font-semibold text-ink">
              {price}
              <span className="text-base font-normal text-ink-soft"> a month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              <Feature>Everything unlocked, with no credits to count</Feature>
              <Feature>A usage limit that refills every five hours, and a weekly limit</Feature>
              <Feature>Unlimited avatars and searches</Feature>
              <Feature>No watermark</Feature>
              <Feature>Buy credits to keep going when a limit is full</Feature>
            </ul>
            <div className="mt-8">
              <RedirectButton action={startSubscription} signedOutHref="/signup" className="w-full">
                Upgrade to Pro
              </RedirectButton>
            </div>
          </div>
        </div>

        {list.length > 0 ? (
          <div className="mx-auto mt-16 max-w-3xl">
            <h3 className="text-center text-sm font-medium text-ink">Credit packs for Pro members</h3>
            <p className="mt-1 text-center text-sm text-ink-soft">When a limit is full you can wait for it to refill, or use credits to keep working.</p>
            <ul aria-label="Credit packs" className="mt-6 grid gap-4 sm:grid-cols-3">
              {list.map((pack) => (
                <li key={pack.id} className="rounded-2xl border border-hairline bg-paper p-6 text-center">
                  <h4 className="text-sm font-medium text-ink-soft">{pack.name}</h4>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{pack.credits.toLocaleString("en-US")}</p>
                  <p className="text-sm text-ink-soft">credits</p>
                  <p className="mt-3 text-lg font-medium text-ink">{formatPrice(pack.price_cents, pack.currency)}</p>
                  <p className="text-xs text-ink-soft">{perCredit(pack.price_cents, pack.credits, pack.currency)} per credit</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
