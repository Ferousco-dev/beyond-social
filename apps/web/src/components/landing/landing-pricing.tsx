"use client";

import NumberFlow from "@number-flow/react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type PricingTier } from "@/lib/marketing/types";
import { PRICING_TIERS } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

/**
 * Pricing.
 *
 * Three cards rather than a shared table: the featured plan lifts out of the
 * row and the eye lands on it first, which is the point of a guided choice.
 * The annual toggle celebrates with a small confetti burst, since it is the
 * one interaction on this section a visitor takes more than once.
 */
export function LandingPricing(): ReactNode {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (!checked || !switchRef.current) return;

    const rect = switchRef.current.getBoundingClientRect();
    void confetti({
      particleCount: 50,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ["#0066ff", "#66a3ff", "#111827"],
      ticks: 200,
      gravity: 1.2,
      decay: 0.94,
      startVelocity: 30,
      shapes: ["circle"],
    });
  };

  return (
    <section id="pricing" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, upgrade when it earns it"
          description="Every plan includes the full engine. You are paying for volume, not for the good features."
        />

        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={cn("text-sm font-medium", isMonthly ? "text-ink" : "text-ink-soft")}>
            Monthly
          </span>
          <Switch ref={switchRef} checked={!isMonthly} onCheckedChange={handleToggle} />
          <span className={cn("text-sm font-medium", isMonthly ? "text-ink-soft" : "text-ink")}>
            Annual <span className="text-primary">(save 20%)</span>
          </span>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier, index) => (
            <PlanCard
              key={tier.name}
              tier={tier}
              isMonthly={isMonthly}
              isDesktop={isDesktop}
              position={index === 0 ? "left" : index === 2 ? "right" : "center"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  tier,
  isMonthly,
  isDesktop,
  position,
}: {
  tier: PricingTier;
  isMonthly: boolean;
  isDesktop: boolean;
  position: "left" | "center" | "right";
}): ReactNode {
  const price = isMonthly ? tier.monthlyPriceUsd : tier.yearlyPriceUsd;

  return (
    <motion.article
      initial={{ y: 24, opacity: 0 }}
      whileInView={
        isDesktop
          ? {
              y: tier.featured ? -12 : 0,
              opacity: 1,
              scale: position === "center" ? 1 : 0.96,
            }
          : { y: 0, opacity: 1 }
      }
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        delay: position === "left" ? 0 : position === "right" ? 0.1 : 0.05,
      }}
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 text-center",
        tier.featured ? "border-primary bg-canvas" : "border-hairline bg-paper",
      )}
    >
      {tier.featured ? (
        <div className="absolute top-0 right-6 flex -translate-y-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1">
          <Star className="size-3.5 fill-current text-primary-foreground" aria-hidden />
          <span className="text-xs font-semibold text-primary-foreground">Most popular</span>
        </div>
      ) : null}

      <p className="text-sm font-semibold text-ink">{tier.name}</p>

      <div className="mt-6 flex min-h-14 items-center justify-center gap-1.5">
        {price !== null ? (
          <>
            <span className="text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
              <NumberFlow
                value={price}
                format={{
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }}
                transformTiming={{ duration: 500, easing: "ease-out" }}
              />
            </span>
            {!tier.isFree ? <span className="text-sm text-ink-soft">/month</span> : null}
          </>
        ) : (
          <span className="text-lg font-medium leading-none text-ink-soft">Coming soon</span>
        )}
      </div>

      <p className="mt-1 text-xs text-ink-soft">
        {price === null || tier.isFree ? " " : isMonthly ? "billed monthly" : "billed annually"}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{tier.description}</p>

      <p className="mt-5 text-sm font-medium tabular-nums text-ink">{tier.videos}</p>

      <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-hairline pt-6 text-left">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={tier.href}
        className={cn(
          buttonVariants({ variant: tier.featured ? "default" : "outline" }),
          "mt-7 w-full",
        )}
      >
        {tier.cta}
      </Link>
    </motion.article>
  );
}
