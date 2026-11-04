import { type ReactNode } from "react";

import { ClosingPanel } from "./closing-panel";
import { LandingHeader } from "./landing-header";
import { Reveal } from "./reveal";

/**
 * Shared shell for the secondary marketing pages. Keeps the header, footer, and
 * page-opening rhythm identical everywhere so the whole site reads as one brand.
 */
export function PageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <LandingHeader />
      <main id="main">
        <section className="relative overflow-hidden pt-36 sm:pt-44">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_70%)] blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-3xl px-5 sm:px-6">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-soft">{lede}</p>
            </Reveal>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
            <Reveal>{children}</Reveal>
          </div>
        </section>
      </main>
      <ClosingPanel />
    </div>
  );
}

/** A simple prose block, styled consistently across the secondary pages. */
export function Prose({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-5 text-base leading-relaxed text-ink-soft">{children}</div>
  );
}
