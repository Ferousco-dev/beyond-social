import { Check } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { PRICING_TIERS } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Pricing. One recommended tier is lifted with an accent border so the choice is
 * guided, and every plan states the video allowance plainly. No dark patterns.
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

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PRICING_TIERS.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 80}>
              <article
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-paper p-6 sm:p-7",
                  tier.featured ? "border-primary/50 ring-1 ring-primary/20" : "border-hairline",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{tier.name}</h3>
                  {tier.featured ? (
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      Most popular
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums text-ink">
                    {tier.price}
                  </span>
                  <span className="text-sm text-ink-soft">/month</span>
                </p>
                <p className="mt-2 text-sm text-ink-soft">{tier.description}</p>
                <p className="mt-4 rounded-lg border border-hairline bg-canvas px-3 py-2 text-xs font-medium text-ink">
                  {tier.videos}
                </p>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={cn(
                    "mt-7 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    tier.featured
                      ? "bg-primary text-primary-foreground"
                      : "border border-hairline text-ink hover:bg-cloud",
                  )}
                >
                  {tier.cta}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
