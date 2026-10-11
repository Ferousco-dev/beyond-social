import { type ReactNode } from "react";

import { STEPS } from "@/lib/marketing/landing";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Three numbered steps. A hairline rule connects them on desktop so the sequence
 * reads as one continuous flow rather than three unrelated cards.
 */
export function HowItWorks(): ReactNode {
  return (
    <section id="ai-workflow" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Idea to published in three moves"
          description="No storyboards, no timeline to learn first. The craft happens between your sentence and the finished cut."
        />

        <ol className="relative mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          <span
            aria-hidden
            className="absolute left-0 right-0 top-5 hidden h-px bg-hairline sm:block"
          />
          {STEPS.map((step, index) => (
            <Reveal key={step.index} delay={index * 100}>
              <li className="relative">
                <span className="relative z-10 inline-flex size-10 items-center justify-center rounded-full border border-hairline bg-canvas text-xs font-semibold tabular-nums text-primary">
                  {step.index}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
