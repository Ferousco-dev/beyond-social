import { ArrowRight, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { SafariEditor } from "./safari-editor";

/*
 * The hero, built from the owner's EcoVest hero and recoloured to Beyond Social
 * blue. Back to front: two tilted triangles in a blue gradient, a frosted band
 * layer that turns them into a streaked glow, then the badge, headline, copy
 * and button, and the editor in a Safari window rising from the bottom edge.
 */

const BLUE_FROM = "#0066ff";
const BLUE_TO = "#9cc7ff";

function Triangle({ id }: { id: string }): ReactNode {
  return (
    <svg viewBox="0 0 1732.05 753.615" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="597.568" y1="277.763" x2="1023.03" y2="490.184" gradientUnits="userSpaceOnUse">
          <stop stopColor={BLUE_FROM} />
          <stop offset="1" stopColor={BLUE_TO} />
        </linearGradient>
      </defs>
      <path d="M866.025 0L1732.05 753.615H0L866.025 0Z" fill={`url(#${id})`} />
    </svg>
  );
}

function Backdrop(): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[calc(50%+11.6px)] top-[300px] isolate h-[1657px] w-[3301px] origin-top -translate-x-1/2 scale-[0.45] bg-paper sm:top-[220px] sm:scale-[0.6] md:top-[90px] md:scale-[0.8] xl:top-0 xl:scale-100"
    >
      <div className="absolute left-0 top-[83px] flex h-[1574px] w-[2213px] items-center justify-center blur-[50px]">
        <div className="relative h-[1005px] w-[2000px]" style={{ rotate: "162deg", scale: "1 -1" }}>
          <div className="absolute bottom-1/4 left-[6.7%] right-[6.7%] top-0">
            <Triangle id="hero-tri-a" />
          </div>
        </div>
      </div>
      <div className="absolute left-[1088.6px] top-[83px] flex h-[1574px] w-[2213px] items-center justify-center blur-[50px]">
        <div className="relative h-[1005px] w-[2000px]" style={{ rotate: "18deg" }}>
          <div className="absolute bottom-1/4 left-[6.7%] right-[6.7%] top-0">
            <Triangle id="hero-tri-b" />
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(40,40,40,0.38) 16.667%, rgba(255,255,255,0.12) 100%)",
          backgroundSize: "65px 100%",
          backgroundRepeat: "repeat-x",
        }}
      />
    </div>
  );
}

/** The Beyond Social mark as a glossy app icon set into the headline, with a soft glow behind it. */
function AppIcon(): ReactNode {
  const tile = "absolute inset-0 grid place-items-center overflow-hidden rounded-[21%] border-[2.3px] border-white bg-[linear-gradient(180deg,#0047b3_0%,#4d94ff_100%)]";
  return (
    <span aria-hidden="true" className="relative mx-[0.12em] inline-block h-[0.9em] w-[0.9em] translate-y-[0.06em] align-baseline">
      <span className={`${tile} opacity-80 blur-[20px]`} />
      <span className={tile}>
        <span className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,255,255,0.45),rgba(255,255,255,0)_60%)]" />
        <Image src="/brand/logo-mark-dark.png" alt="" width={64} height={64} className="relative h-[62%] w-[62%] object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,20,60,0.35)]" />
      </span>
    </span>
  );
}

const TOPICS = ["TikTok", "Instagram Reels", "Talking avatars", "Captions", "AI editor", "Scheduling", "Trends"];

/** EcoVest's "what you'll learn" row, as what Beyond Social makes. */
function Topics(): ReactNode {
  return (
    <section className="flex flex-col items-center gap-9 pb-10 pt-16 md:pt-20">
      <p className="px-5 text-center text-[16px] leading-[1.4] tracking-[-0.015em] text-[#6b7079] md:text-[18px]">
        What you can <span className="bg-gradient-to-b from-[#0052cc] to-[#4d94ff] bg-clip-text text-transparent">make with Beyond Social</span>
      </p>
      <div className="relative w-full max-w-[1225px] overflow-hidden">
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 md:flex-nowrap md:gap-12">
          {TOPICS.map((topic) => (
            <li key={topic} className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.03em] text-[#6b7079] md:text-[24px]">
              {topic}
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[153px] bg-gradient-to-r from-canvas to-transparent md:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[153px] bg-gradient-to-l from-canvas to-transparent md:block" />
      </div>
    </section>
  );
}

export function EcoHero(): ReactNode {
  return (
    <div className="bg-canvas">
      <section id="hero" className="relative flex w-full flex-col overflow-hidden rounded-b-[20px] bg-paper pt-24 md:min-h-[100svh]">
        <Backdrop />
        <div className="relative z-10 mx-auto mt-6 flex max-w-[760px] flex-col items-center px-5 text-center md:mt-10">
          <div className="inline-flex items-center gap-1 rounded-[61px] border border-[rgba(0,102,255,0.22)] bg-white px-2.5 py-1.5 sm:px-3 sm:py-2">
            <Zap className="size-4 text-primary" aria-hidden />
            <span className="text-[12px] uppercase leading-[1.5] tracking-[-0.01em] text-ink-soft sm:text-[14px]">Videos that post themselves</span>
          </div>
          <h1 className="mt-5 text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-ink sm:mt-6 sm:text-[56px] md:text-[72px]">
            One idea <AppIcon /> in,
            <br />
            Videos <span className="font-serif text-[1.02em] font-normal italic tracking-[-0.02em]">out</span>
          </h1>
          <p className="mt-4 max-w-[622px] text-[15px] leading-[1.45] tracking-[-0.015em] text-ink-soft sm:mt-6 md:text-[18px]">
            Write one sentence. Our AI writes the script, makes the video, adds captions, and posts it to TikTok and Instagram at the best time.
          </p>
          <div className="mt-7 sm:mt-9">
            <Link href="/signup" className="btn btn-primary btn-lg group">
              Start creating free
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
        <SafariEditor />
      </section>
      <Topics />
    </div>
  );
}
