import { type ReactNode } from "react";

import { FEATURES } from "@/lib/marketing/product";

import { Section, SectionHeading } from "./section";

export function FeatureGrid(): ReactNode {
  return (
    <Section id="features" className="border-t border-border bg-secondary/40">
      <SectionHeading
        eyebrow="Features"
        title="A complete creation stack, not a single trick"
        description="Every step from idea to published post is handled in one place, so you never export, re-upload, or switch tools."
      />

      <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="bg-card p-6">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <feature.icon className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
