import { type ReactNode } from "react";

import {
  AnthropicIcon,
  GoogleGeminiIcon,
  NextJsIcon,
  OpenAIIcon,
  SupabaseIcon,
  VercelIcon,
} from "@/components/brand/tech-icons";

/**
 * The horizon, and the stack orbiting it.
 *
 * The arc is one enormous circle sitting mostly below the fold, so only its
 * crown shows and the light appears to come from behind it. The marks ride that
 * same circle rather than sitting in a row above it, which is the whole point:
 * a marquee is a list of vendors, an orbit is a system the product sits inside.
 *
 * Everything is derived from `--primary`, so this follows the brand and both
 * themes rather than hardcoding a colour.
 */

/**
 * The circle, shared by the arc and the orbit so the marks sit *on* the edge
 * rather than near it. Changing one without the other is what makes them drift
 * off the curve, so both read from here.
 *
 * `top` puts the crown of the arc just under the last line of copy, so the
 * tangent runs beneath the text rather than through it.
 */
const SPHERE = {
  /**
   * Six times the viewport.
   *
   * At twice it read as a dome and at three times as a hill. Curvature falls as
   * the radius grows, and the target is barely a curve at all: something like
   * fifty pixels of rise across the whole screen, so the eye reads the edge of
   * somewhere enormous rather than the top of a ball.
   */
  width: "600vw",
  /** Low enough that the crown clears the copy and the glow owns the space above it. */
  top: "82%",
} as const;

/** The real stack. Every mark is something the product actually runs on. */
const LOGOS = [
  { node: <AnthropicIcon />, title: "Anthropic" },
  { node: <GoogleGeminiIcon />, title: "Google Gemini" },
  { node: <OpenAIIcon />, title: "OpenAI" },
  { node: <SupabaseIcon />, title: "Supabase" },
  { node: <NextJsIcon />, title: "Next.js" },
  { node: <VercelIcon />, title: "Vercel" },
] as const;

/**
 * One mark every nine degrees, the whole way round.
 *
 * The circle is so large that only about ten degrees of its arc is ever on
 * screen, and flattening it further narrows that window, which is why the step
 * is small. Six marks spread over 360 degrees would leave that window empty for
 * most of the cycle, which is exactly what the first attempt did: the logos
 * were correct, on the circle, and two thousand pixels below the fold.
 * Populating the entire circle instead means marks are always entering one side
 * of the crown as others leave the far side, so the stream never breaks.
 */
const STEP_DEGREES = 5;
const MARKS = Array.from({ length: Math.round(360 / STEP_DEGREES) }, (_, index) => ({
  ...LOGOS[index % LOGOS.length]!,
  angle: index * STEP_DEGREES,
  key: index,
}));

export function HeroOrbit(): ReactNode {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The wash. Broad and weak, so the headline stays readable over it. */}
      <div className="absolute inset-x-0 top-0 h-[54rem] bg-[radial-gradient(80%_60%_at_50%_88%,color-mix(in_srgb,var(--primary)_30%,transparent),transparent_72%)] blur-2xl" />

      {/*
        The orbit sits behind the sphere in the stacking order on purpose: a
        mark that travels past the crown slides under the horizon rather than
        over it, which is what sells the curve.
      */}
      <div
        style={{ width: SPHERE.width, top: SPHERE.top }}
        className="absolute left-1/2 aspect-square -translate-x-1/2"
      >
        <div className="absolute inset-0 motion-safe:animate-[orbit_600s_linear_infinite]">
          {MARKS.map((mark) => (
            <span
              key={mark.key}
              style={{ transform: `rotate(${mark.angle}deg)` }}
              // `items-start` matters: without it the flex child stretches to
              // the full height of the ring, and a 50% translate becomes half
              // the radius instead of half the mark.
              className="absolute inset-0 flex items-start justify-center"
            >
              <span className="-translate-y-[calc(50%+1.5rem)]">
                <span style={{ transform: `rotate(${-mark.angle}deg)` }} className="block">
                  <span
                    title={mark.title}
                    className="block text-ink-soft [&_svg]:size-5 sm:[&_svg]:size-6"
                  >
                    {mark.node}
                  </span>
                </span>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* The body of the sphere, drawn over the orbit. The rim is its top
          border and the glow is the light escaping from behind it. */}
      <div
        style={{ width: SPHERE.width, top: SPHERE.top }}
        className="absolute left-1/2 aspect-square -translate-x-1/2 rounded-full border-t border-[color-mix(in_srgb,var(--primary)_85%,transparent)] bg-canvas shadow-[0_-30px_90px_-10px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
      />
    </div>
  );
}

/**
 * The faint grid behind everything.
 *
 * Masked so it fades well before it reaches the headline: a ruled line running
 * behind type is what makes a background look cheap. It exists so a large flat
 * area does not read as empty, not to be looked at.
 */
export function HeroGrid(): ReactNode {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--hairline)_1px,transparent_1px),linear-gradient(to_bottom,var(--hairline)_1px,transparent_1px)] [background-size:88px_88px] [mask-image:radial-gradient(70%_55%_at_50%_35%,black,transparent)]"
    />
  );
}
