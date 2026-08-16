import { type ReactNode } from "react";

import { FeatureGrid } from "./feature-grid";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/** The capabilities grid. The cards themselves live in `FeatureGrid`. */
export function FeatureBento(): ReactNode {
  return (
    <section id="features" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Capabilities"
          title="An engine that understands craft"
          description="Not a wrapper around a video model. Directing knowledge, a real editor, native publishing, and a feedback loop that compounds."
        />

        <Reveal delay={80} className="mt-14">
          <FeatureGrid />
        </Reveal>
      </div>
    </section>
  );
}
