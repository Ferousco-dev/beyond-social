import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { Reveal } from "./reveal";

/**
 * Closing call to action. A single panel with one action, echoing the hero's
 * light source so the page ends where it began.
 */
export function FinalCta(): ReactNode {
  return (
    <section className="border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-hairline bg-paper px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-[radial-gradient(50%_60%_at_50%_50%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%)] blur-2xl"
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                Your next video is one sentence away
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-soft">
                Start free, keep what you make, and let the engine get sharper with every clip you
                publish.
              </p>
              <Link
                href="/signup"
                className="group mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start creating free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
