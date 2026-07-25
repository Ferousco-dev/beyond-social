import { type ReactNode } from "react";

import { FeatureBento } from "@/components/landing/feature-bento";
import { FinalCta } from "@/components/landing/final-cta";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { Showcase } from "@/components/landing/showcase";
import { StatsBar } from "@/components/landing/stats-bar";

/**
 * The landing page renders in the dark "operating environment" palette so the
 * marketing surface and the product feel like one system. The `dark` class
 * scopes the dark token set to this subtree.
 */
export default function HomePage(): ReactNode {
  return (
    // `overflow-x-hidden` guards against any decorative element widening the
    // page on small screens, which would let the layout scroll sideways.
    <div className="dark min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main>
        <LandingHero />
        <StatsBar />
        <FeatureBento />
        <HowItWorks />
        <Showcase />
        <LandingPricing />
        <LandingFaq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
