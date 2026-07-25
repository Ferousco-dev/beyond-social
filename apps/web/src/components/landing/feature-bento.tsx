import { type ReactNode } from "react";

import { MagicBento } from "./magic-bento";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * The capabilities grid. The cards themselves live in `MagicBento`, which adds
 * the cursor-tracking glow and particle work on pointer devices.
 */
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
          <MagicBento />
        </Reveal>
      </div>
    </section>
  );
}
