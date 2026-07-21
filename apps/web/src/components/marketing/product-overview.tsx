import { Check } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { Section, SectionHeading } from "./section";

const POINTS: readonly string[] = [
  "Generate from your own photos, no shoot required",
  "Edit, caption, and schedule in the same workspace",
  "Track every project, credit, and post in one dashboard",
];

export function ProductOverview(): ReactNode {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="The platform"
            title="Everything you need to create, in one place"
            description="Beyond Social replaces the scattered stack of generators, editors, and schedulers with a single workspace built around how creators actually work."
          />
          <ul className="mt-8 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" />
                </span>
                <span className="text-[15px] text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
          <Image
            src="/images/creators-team.jpg"
            alt="A small content team working together on laptops"
            fill
            sizes="(min-width: 1024px) 32rem, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
