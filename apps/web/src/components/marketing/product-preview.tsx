import { type ReactNode } from "react";

import { DashboardPreview } from "./dashboard-preview";
import { Section, SectionHeading } from "./section";

export function ProductPreview(): ReactNode {
  return (
    <Section className="border-t border-border">
      <SectionHeading
        align="center"
        eyebrow="Your workspace"
        title="Your whole pipeline, on one screen"
        description="Projects, remaining credits, generation status, and the publishing schedule live together in a dashboard built for daily use."
      />
      <div className="mx-auto mt-12 max-w-4xl">
        <DashboardPreview />
      </div>
    </Section>
  );
}
