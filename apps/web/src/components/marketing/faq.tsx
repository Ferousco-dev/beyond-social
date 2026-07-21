import { Plus } from "lucide-react";
import { type ReactNode } from "react";

import { FAQ_ITEMS } from "@/lib/marketing/plans";

import { Section, SectionHeading } from "./section";

export function Faq(): ReactNode {
  return (
    <Section id="faq" className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything worth knowing before you create your first video."
        />

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {FAQ_ITEMS.map((item) => (
            <li key={item.question}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
