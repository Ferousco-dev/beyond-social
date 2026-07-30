import { type ReactNode } from "react";

import { ClosingPanel } from "@/components/landing/closing-panel";
import { FeatureBento } from "@/components/landing/feature-bento";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { PoweredBy } from "@/components/landing/powered-by";
import { Showcase } from "@/components/landing/showcase";

/**
 * The landing page renders in the dark "operating environment" palette so the
 * marketing surface and the product feel like one system. The `dark` class
 * scopes the dark token set to this subtree.
 */
export default function HomePage(): ReactNode {
  return (
    // `overflow-x-hidden` guards against any decorative element widening the
    // page on small screens, which would let the layout scroll sideways.
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main id="main">
        <LandingHero />
        <PoweredBy />
        <FeatureBento />
        <HowItWorks />
        <Showcase />
        <LandingPricing />
        <LandingFaq />
      </main>
      <ClosingPanel />
    </div>
  );
}
