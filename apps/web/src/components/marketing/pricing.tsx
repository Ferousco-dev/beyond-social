import { Check } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PRICING_TIERS } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

import { Section, SectionHeading } from "./section";

export function Pricing(): ReactNode {
  return (
    <Section id="pricing" className="border-t border-border bg-secondary/40">
      <SectionHeading
        align="center"
        eyebrow="Pricing"
        title="Simple plans that scale with you"
        description="Pricing opens soon. Here is an early look at the plans you will be able to choose from."
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card p-6",
              tier.featured ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <div aria-hidden className="pointer-events-none flex select-none flex-col blur-[6px]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{tier.name}</h3>
                {tier.featured ? (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm font-medium">{tier.videos}</p>

              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  tabIndex={-1}
                  variant={tier.featured ? "default" : "outline"}
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-border bg-background/70 px-3.5 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm">
                Coming soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
