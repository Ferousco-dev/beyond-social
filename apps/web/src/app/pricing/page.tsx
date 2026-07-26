import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ClosingPanel } from "@/components/landing/closing-panel";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingPricing } from "@/components/landing/landing-pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every plan includes the full engine. You are paying for volume, not for the good features.",
};

/**
 * Standalone pricing page.
 *
 * It exists for two reasons beyond being linkable: Stripe Checkout sends a
 * cancelled purchase here, and until this route existed that landed on a 404
 * at the exact moment a customer was already hesitating.
 *
 * It reuses the landing sections rather than restating the plans, so there is
 * one set of pricing cards in the codebase and no chance of the page and the
 * landing section disagreeing.
 */
export default function PricingPage(): ReactNode {
  return (
    <div className="dark min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main>
        {/* Offset for the fixed header, which the landing page gets from its hero. */}
        <div className="pt-24 sm:pt-28">
          <LandingPricing />
        </div>
        <LandingFaq />
      </main>
      <ClosingPanel />
    </div>
  );
}
