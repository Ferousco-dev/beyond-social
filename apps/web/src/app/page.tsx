import { type ReactNode } from "react";

import { Benefits } from "@/components/marketing/benefits";
import { Faq } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { Pricing } from "@/components/marketing/pricing";
import { ProductOverview } from "@/components/marketing/product-overview";
import { ProductPreview } from "@/components/marketing/product-preview";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { AI_WORKFLOW, PUBLISH_WORKFLOW } from "@/lib/marketing/product";

export default function HomePage(): ReactNode {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <LogoCloud />
        <ProductOverview />
        <FeatureGrid />
        <WorkflowSection
          id="ai-workflow"
          eyebrow="How it works"
          title="From idea to video in three steps"
          description="The conversational engine handles scripting and generation so you can go from a thought to a finished clip without leaving the chat."
          steps={AI_WORKFLOW}
        />
        <WorkflowSection
          id="publishing"
          eyebrow="Publishing"
          title="From video to every feed, automatically"
          description="Once a clip is ready, publishing handles the formatting, timing, and distribution across all of your platforms."
          steps={PUBLISH_WORKFLOW}
          className="border-t border-border bg-secondary/40"
        />
        <ProductPreview />
        <Benefits />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
