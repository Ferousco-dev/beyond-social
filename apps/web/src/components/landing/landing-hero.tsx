import { Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { PLATFORMS } from "@/lib/marketing/site";

import { HeroGrid, HeroOrbit } from "./hero-orbit";
import { Reveal } from "./reveal";

/**
 * The hero.
 *
 * One idea, stated once, over a horizon that suggests scale without saying
 * anything. Everything is centred and stacked so the eye runs straight down the
 * middle: badge, claim, explanation, action. Nothing competes.
 *
 * The stack the product runs on orbits the horizon rather than sitting in a
 * marquee below it. A row of logos is a list of vendors; the same marks on the
 * arc read as the system the product sits inside.
 */
export function LandingHero(): ReactNode {
  return (
    <section className="relative isolate overflow-hidden pb-56 pt-32 sm:pb-72 sm:pt-40">
      <HeroGrid />
      <HeroOrbit />

      <div className="relative mx-auto w-full max-w-5xl px-5 sm:px-6">
        <Reveal className="text-center">
          {/* Two parts: a solid chip carrying the fact, and the sentence it
              belongs to. Splitting them stops a long announcement reading as
              one grey smear. */}
          <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-paper/70 py-1.5 pl-1.5 pr-4 text-xs backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold tracking-wide text-canvas">
              <Sparkles className="size-3" aria-hidden />
              NEW
            </span>
            <span className="text-ink-soft">Prompt intelligence engine, now live</span>
          </span>

          {/*
            The gradient runs top to bottom across both lines, so the second
            sits back from the first and the block reads as one object catching
            light. A clipped background over transparent text is the only way to
            do that which still selects and copies as text.
          */}
          <h1 className="mx-auto mt-8 max-w-4xl text-balance bg-gradient-to-b from-ink via-ink to-[color-mix(in_srgb,var(--ink)_55%,transparent)] bg-clip-text text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-transparent sm:text-6xl lg:text-[4.75rem]">
            Video that looks directed, not generated
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
            Describe an idea or drop in a product photo. Beyond Social directs the shot, cuts the
            video, and publishes it to every platform in the format each one rewards.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* The primary action carries its own glow rather than borrowing the
                section's: it has to stay the brightest thing on screen even
                where the horizon is strongest. */}
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_60%,transparent),0_8px_32px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100 sm:w-auto"
            >
              Start creating free
            </Link>
            <a
              href="#showcase"
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-hairline bg-paper/40 px-8 text-sm font-medium text-ink backdrop-blur-md transition-colors hover:border-ink-soft/40 hover:bg-paper/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              <Play className="size-3.5 fill-current" aria-hidden />
              See what it makes
            </a>
          </div>

          <p className="mt-6 text-xs text-ink-soft">
            No card required. Publishes to {PLATFORMS.slice(0, 3).join(", ")}, and more.
          </p>
        </Reveal>
      </div>

      {/* The orbit is decorative and hidden from assistive tech, so the claim it
          makes is stated here in text instead. */}
      <p className="sr-only">
        Built on frontier models and infrastructure: Anthropic, Google Gemini, OpenAI, Supabase,
        Next.js and Vercel.
      </p>
    </section>
  );
}
