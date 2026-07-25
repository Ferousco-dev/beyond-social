import { ArrowRight, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { HERO_IMAGE, HERO_IMAGE_ALT, HERO_PHRASES } from "@/lib/marketing/landing";
import { PLATFORMS } from "@/lib/marketing/site";

import { Reveal } from "./reveal";
import { ScreenshotFrame } from "./screenshot-frame";
import { TextType } from "./text-type";

/**
 * The hero. One idea, one primary action, and proof of the real product: the
 * frame holds an actual screenshot of the workspace, with the 9:16 output it
 * produces overlapping it so both halves of the promise are visible at once.
 */
export function LandingHero(): ReactNode {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/80 px-3.5 py-1.5 text-xs text-ink-soft backdrop-blur-sm">
            <Sparkles className="size-3 text-primary" aria-hidden />
            Prompt intelligence engine, now live
          </span>

          <h1 className="mt-7 text-balance text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[4.5rem]">
            Video that looks
            <br className="hidden sm:block" />{" "}
            {/* The canonical headline for assistive tech and crawlers; the
                animated version below is decorative and hidden from them. */}
            <span className="sr-only">directed, not generated</span>
            <TextType
              aria-hidden
              text={HERO_PHRASES}
              className="italic text-primary"
              cursorClassName="not-italic text-ink-soft/60"
            />
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
            Describe an idea or drop in a product photo. Beyond Social directs the shot, cuts the
            video, and publishes it to every platform in the format each one rewards.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-canvas transition-all duration-200 hover:scale-[1.02] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100 sm:w-auto"
            >
              Start creating free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <a
              href="#showcase"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-hairline px-7 text-sm font-medium text-ink transition-colors hover:border-ink-soft/40 hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              <Play className="size-3.5 fill-current" />
              See what it makes
            </a>
          </div>

          <p className="mt-5 text-xs text-ink-soft">
            No card required. Publishes to {PLATFORMS.slice(0, 3).join(", ")}, and more.
          </p>
        </Reveal>

        <Reveal delay={120} className="relative mt-16 sm:mt-20">
          <ScreenshotFrame
            src="/images/product-dashboard.png"
            alt="The Beyond Social workspace showing video performance, reach by platform, and active projects"
            label="beyondsocial.app/dashboard"
            priority
          />

          {/* The vertical output, overlapping the desktop app. */}
          <figure className="absolute -bottom-6 right-2 w-24 rotate-3 overflow-hidden rounded-xl border border-white/10 shadow-2xl motion-safe:animate-[float_6s_ease-in-out_infinite] sm:-bottom-10 sm:right-6 sm:w-36 sm:rounded-2xl lg:w-44">
            <Image
              src={HERO_IMAGE}
              alt={HERO_IMAGE_ALT}
              width={420}
              height={746}
              sizes="(max-width: 640px) 96px, 176px"
              className="aspect-[9/16] w-full object-cover"
            />
            <figcaption className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-1 text-[9px] font-medium text-white backdrop-blur-sm sm:inset-x-2 sm:bottom-2 sm:rounded-lg sm:px-2 sm:py-1.5 sm:text-[11px]">
              Built for the trail
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
