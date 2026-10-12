import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ClosingPanel } from "@/components/landing/closing-panel";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingPricing } from "@/components/landing/landing-pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "No plans. Start with free credits and buy more when you need them.",
};

/**
 * Standalone pricing page.
 */
export default function PricingPage(): ReactNode {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main id="main">
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
