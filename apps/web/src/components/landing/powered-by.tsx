import { type ReactNode } from "react";

import {
  AnthropicIcon,
  GoogleGeminiIcon,
  NextJsIcon,
  OpenAIIcon,
  SupabaseIcon,
  VercelIcon,
} from "@/components/brand/tech-icons";

import { LogoLoop, type LogoItem } from "./logo-loop";
import { Reveal } from "./reveal";

/**
 * The models and infrastructure the product actually runs on. Every mark here is
 * part of the real stack, so the row is a statement of fact rather than borrowed
 * credibility.
 */
const LOGOS: readonly LogoItem[] = [
  { node: <AnthropicIcon />, title: "Anthropic", href: "https://www.anthropic.com" },
  {
    node: <GoogleGeminiIcon />,
    title: "Google Gemini",
    href: "https://deepmind.google/technologies/gemini",
  },
  { node: <OpenAIIcon />, title: "OpenAI", href: "https://openai.com" },
  { node: <SupabaseIcon />, title: "Supabase", href: "https://supabase.com" },
  { node: <NextJsIcon />, title: "Next.js", href: "https://nextjs.org" },
  { node: <VercelIcon />, title: "Vercel", href: "https://vercel.com" },
];

export function PoweredBy(): ReactNode {
  return (
    <section className="border-y border-hairline bg-paper/40 py-12 sm:py-14">
      <Reveal className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
          Built on frontier models and infrastructure
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <div className="text-ink-soft [&_a:hover]:text-ink [&_svg]:size-7 sm:[&_svg]:size-8">
          <LogoLoop
            logos={LOGOS}
            speed={38}
            direction="left"
            logoHeight={32}
            gap={72}
            hoverSpeed={0}
            fadeOut
            scaleOnHover
            ariaLabel="Technologies Beyond Social is built on"
          />
        </div>
      </Reveal>
    </section>
  );
}
