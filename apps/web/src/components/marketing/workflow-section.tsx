import { type ReactNode } from "react";

import { type WorkflowStep } from "@/lib/marketing/types";

import { Section, SectionHeading } from "./section";

export function WorkflowSection({
  id,
  eyebrow,
  title,
  description,
  steps,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  steps: readonly WorkflowStep[];
  className?: string;
}): ReactNode {
  return (
    <Section id={id} className={className}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums text-primary">
                {index + 1}
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
