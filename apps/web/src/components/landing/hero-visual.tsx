import { ArrowUp, Check, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { HERO_IMAGE, HERO_IMAGE_ALT } from "@/lib/marketing/landing";

const SHOTS: readonly string[] = ["Slow push-in", "Macro detail", "Golden hour", "Match cut"];

/**
 * A vignette of the real creation surface: the prompt composer, the directing
 * choices the engine made, and the resulting vertical draft. Every element maps
 * to a shipped feature, so the hero shows the product rather than an idealised
 * illustration of it.
 */
export function HeroVisual(): ReactNode {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* A single soft light source behind the frame gives depth without glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -top-10 bottom-16 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_70%)] blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <span className="size-2.5 rounded-full bg-cloud" />
          <span className="size-2.5 rounded-full bg-cloud" />
          <span className="size-2.5 rounded-full bg-cloud" />
          <p className="ml-2 truncate text-xs text-ink-soft">Trail shoe launch teaser</p>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-medium text-ink-soft">
            <Check className="size-3 text-success" />
            Ready
          </span>
        </div>

        <div className="grid gap-5 p-4 sm:grid-cols-[1fr_10.5rem] sm:p-5">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-xl border border-hairline bg-canvas p-3">
              <p className="text-sm text-ink">
                Turn this trail shoe into a 30 second teaser for Instagram.
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex size-7 items-center justify-center rounded-full border border-hairline text-ink-soft">
                  <Plus className="size-3.5" />
                </span>
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-ink text-canvas">
                  <ArrowUp className="size-3.5" />
                </span>
              </div>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                <Sparkles className="size-3 text-primary" />
                Directing choices
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {SHOTS.map((shot) => (
                  <li
                    key={shot}
                    className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs text-ink-soft"
                  >
                    {shot}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[10.5rem] overflow-hidden rounded-xl border border-hairline bg-canvas">
            <Image
              src={HERO_IMAGE}
              alt={HERO_IMAGE_ALT}
              width={420}
              height={746}
              priority
              sizes="(max-width: 640px) 60vw, 168px"
              className="aspect-[9/16] w-full object-cover"
            />
            <figcaption className="absolute inset-x-2 bottom-2 rounded-lg bg-black/65 px-2 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              Built for the trail
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
