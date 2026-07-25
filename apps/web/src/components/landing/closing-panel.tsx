import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { InstagramIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/brand/social-icons";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@/lib/marketing/site";

import { Reveal } from "./reveal";

const ICONS: Record<string, (props: { className?: string }) => ReactNode> = {
  TikTok: TikTokIcon,
  Instagram: InstagramIcon,
  YouTube: YouTubeIcon,
  X: XIcon,
};

const LINK =
  "text-sm text-ink-soft transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm";

/**
 * The closing call to action and the footer, built as one continuous panel so
 * the page ends on a single surface rather than two stacked blocks. Deliberately
 * flat: the separation comes from the surface step and hairline rules, with no
 * gradients or shadows.
 */
export function ClosingPanel(): ReactNode {
  const year = new Date().getFullYear();

  return (
    <section className="relative overflow-hidden border-t border-hairline bg-paper">
      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-6">
        <Reveal className="py-24 text-center sm:py-32">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Your next video is one sentence away
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-soft">
            Start free, keep what you make, and let the engine sharpen with every clip you publish.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-8 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              Start creating free
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-hairline px-8 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink-soft/40 hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              Talk to us
            </Link>
          </div>
        </Reveal>

        <div className="h-px bg-hairline" />

        <footer>
          {/* Six columns: the brand block spans two, then one per link group. */}
          <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Link href="/" aria-label="Beyond Social home" className="inline-flex">
                <Logo />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
                Video that looks directed, not generated. The engine handles the craft, you make the
                calls.
              </p>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
                  {column.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className={LINK}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="h-px bg-hairline" />

          <div className="flex flex-col items-center justify-between gap-5 py-7 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <p className="text-xs text-ink-soft">© {year} Beyond Social. All rights reserved.</p>
              <a href="/privacy" className={`${LINK} text-xs`}>
                Privacy
              </a>
              <a href="/terms" className={`${LINK} text-xs`}>
                Terms
              </a>
            </div>

            <ul className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => {
                const Icon = ICONS[social.label];
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.label}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors duration-200 hover:border-ink-soft/40 hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {Icon ? <Icon className="size-4" /> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </footer>
      </div>

      {/* Oversized wordmark, cropped by the viewport edge as a brand sign-off. */}
      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center text-[19vw] font-semibold leading-[0.72] tracking-[-0.04em] text-ink/[0.035]"
      >
        Beyond Social
      </p>
    </section>
  );
}
