import { Check } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { type PricingTier } from "@/lib/marketing/types";
import { PRICING_TIERS } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Pricing.
 *
 * One object with three columns rather than three floating cards. Plans are a
 * comparison, and a comparison reads down a shared grid: same baseline for the
 * price, the allowance, and the first feature, so the eye can travel sideways.
 * Three separate cards with their own borders make the same information look
 * like three unrelated offers.
 *
 * The guided choice is marked by a tint and a label, not by a coloured ring.
 * A ring is a decoration competing with the only element that should be
 * coloured on this section, which is the button you are meant to press.
 */
export function LandingPricing(): ReactNode {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, upgrade when it earns it"
          description="Every plan includes the full engine. You are paying for volume, not for the good features."
        />

        <Reveal>
          <div className="mt-14 overflow-hidden rounded-2xl border border-hairline bg-paper">
            <div className="grid lg:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <PlanColumn key={tier.name} tier={tier} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PlanColumn({ tier }: { tier: PricingTier }): ReactNode {
  return (
    <article
      className={cn(
        // Dividers rather than borders: the columns are parts of one table, and
        // the last one must not draw an edge inside the container's own.
        "flex flex-col border-hairline p-7 not-last:border-b lg:not-last:border-b-0 lg:not-last:border-r",
        tier.featured && "bg-canvas",
      )}
    >
      <div className="flex h-6 items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{tier.name}</h3>
        {tier.featured ? (
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Most popular
          </span>
        ) : null}
      </div>

      {/*
        A plan with no price says so. It used to fall back to "Free", which read
        as three free plans on a pricing page and is the one thing a pricing
        page must never get wrong.
      */}
      <p className="mt-5 flex min-h-11 items-baseline gap-1.5">
        {tier.price !== null ? (
          <>
            <span className="text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
              {tier.price}
            </span>
            <span className="text-sm text-ink-soft">/month</span>
          </>
        ) : (
          <span className="text-lg font-medium leading-none text-ink-soft">
            Pricing announced soon
          </span>
        )}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{tier.description}</p>

      <p className="mt-5 text-sm font-medium tabular-nums text-ink">{tier.videos}</p>

      <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-hairline pt-6">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href="/signup"
        className={cn(
          "mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          tier.featured
            ? "bg-primary text-primary-foreground hover:brightness-110"
            : "border border-hairline text-ink hover:bg-cloud",
        )}
      >
        {tier.cta}
      </Link>
    </article>
  );
}
