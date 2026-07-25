import { type ReactNode } from "react";

import { STATS } from "@/lib/marketing/landing";

import { Reveal } from "./reveal";

/**
 * A quiet band of concrete numbers directly under the hero. Specific figures
 * carry more weight than adjectives, and the band doubles as a visual pause
 * between the hero and the first content section.
 */
export function StatsBar(): ReactNode {
  return (
    <section className="border-y border-hairline bg-paper/40">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <dl className="grid grid-cols-2 divide-hairline sm:grid-cols-4 sm:divide-x">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 60}>
              <div className="px-2 py-8 text-center sm:px-6">
                <dd className="text-3xl font-semibold tracking-tight tabular-nums text-ink sm:text-4xl">
                  {stat.value}
                </dd>
                <dt className="mt-1.5 text-xs leading-relaxed text-ink-soft">{stat.label}</dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
