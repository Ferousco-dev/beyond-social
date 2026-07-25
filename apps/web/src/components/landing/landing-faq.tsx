import { Plus } from "lucide-react";
import { type ReactNode } from "react";

import { LANDING_FAQ } from "@/lib/marketing/landing";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * FAQ built on native `details` elements: keyboard accessible and functional
 * without JavaScript, with the marker rotated via CSS on open.
 */
export function LandingFaq(): ReactNode {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />

        <div className="mt-12 divide-y divide-hairline border-y border-hairline">
          {LANDING_FAQ.map((item, index) => (
            <Reveal key={item.question} delay={index * 50}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[15px] font-medium text-ink transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Plus
                    className="size-4 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 pr-8 text-sm leading-relaxed text-ink-soft">{item.answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
