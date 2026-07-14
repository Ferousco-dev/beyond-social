import Image from "next/image";
import { type ReactNode } from "react";

import { BENEFITS } from "@/lib/marketing/product";

import { Section, SectionHeading } from "./section";

export function Benefits(): ReactNode {
  return (
    <Section className="border-t border-border bg-secondary/40">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative order-last aspect-[4/5] overflow-hidden rounded-2xl border border-border lg:order-first">
          <Image
            src="/images/creator-gear.jpg"
            alt="A professional camera body and lenses arranged on a dark surface"
            fill
            sizes="(min-width: 1024px) 30rem, 100vw"
            className="object-cover"
          />
        </div>

        <div>
          <SectionHeading eyebrow="Why teams switch" title="Built to make you faster, not busier" />
          <div className="mt-8 space-y-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title}>
                <h3 className="text-base font-semibold">{benefit.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
