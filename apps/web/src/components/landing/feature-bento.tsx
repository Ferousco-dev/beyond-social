import { type ReactNode } from "react";

import { FEATURES } from "@/lib/marketing/landing";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * The feature grid. The first card spans two columns so the grid has a clear
 * entry point rather than six equal tiles competing for attention.
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

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 80}>
              <article
                className={cn(
                  "group h-full rounded-2xl border border-hairline bg-paper p-6 transition-colors duration-300 hover:border-ink-soft/30 hover:bg-cloud/40",
                  index === 0 && "lg:col-span-2",
                )}
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-hairline bg-canvas text-primary transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                  <feature.icon className="size-[18px]" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
