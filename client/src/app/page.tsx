import { type ReactNode } from "react";

import { ClosingPanel } from "@/components/landing/closing-panel";
import { FeatureBento } from "@/components/landing/feature-bento";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import { EcoHero } from "@/components/landing/eco-hero";
import { EcoProblem } from "@/components/landing/eco-problem";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LatestArticles } from "@/components/landing/latest-articles";
import { Testimonials } from "@/components/landing/testimonials";
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
    <div className="landing-type min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main id="main">
        <EcoHero />
        <EcoProblem />
        <FeatureBento />
        <HowItWorks />
        <Showcase />
        <LandingPricing />
        <Testimonials />
        <LandingFaq />
        <LatestArticles />
      </main>
      <ClosingPanel />
    </div>
  );
}
