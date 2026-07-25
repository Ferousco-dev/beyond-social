import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { InstagramIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/brand/social-icons";
import { CTA_IMAGE, CTA_IMAGE_ALT } from "@/lib/marketing/landing";
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
 * The closing call to action and the footer.
 *
 * The CTA is a raised card that straddles the boundary between the page and the
 * footer field, so the two read as one panel with the card as its anchor. The
 * card is left-aligned with the image bleeding off its right edge, which gives
 * the end of the page somewhere to look instead of centred text on a flat band.
 */
export function ClosingPanel(): ReactNode {
  const year = new Date().getFullYear();

  return (
    <section className="relative">
      {/* Upper half of the field, which the card overlaps. */}
      <div className="bg-canvas pt-24 sm:pt-32">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
          {/* z-10 sits on the Reveal itself: its transform creates a stacking
              context, so a z-index on the card inside would be trapped there and
              the footer field would paint over the card. */}
          <Reveal className="relative z-10">
            <div className="-mb-20 overflow-hidden rounded-3xl border border-hairline bg-cloud sm:-mb-24">
              <div className="grid items-center lg:grid-cols-[1.05fr_1fr]">
                <div className="p-8 sm:p-12 lg:p-14">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                    Get started
                  </p>
                  <h2 className="mt-5 text-balance text-3xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-4xl lg:text-5xl">
                    Your next video is one sentence away.
                  </h2>
                  <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-ink-soft sm:text-base">
                    Start free, keep what you make, and let the engine sharpen with every clip you
                    publish.
                  </p>

                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/signup"
                      className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Start creating free
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex h-12 items-center justify-center rounded-full border border-ink-soft/30 px-7 text-sm font-medium text-ink transition-colors duration-200 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Talk to us
                    </Link>
                  </div>
                </div>

                {/* Bleeds to the card edge on desktop, caps the card on mobile. */}
                <div className="relative order-first h-48 lg:order-last lg:h-full lg:min-h-[26rem]">
                  <Image
                    src={CTA_IMAGE}
                    alt={CTA_IMAGE_ALT}
                    fill
                    sizes="(max-width: 1024px) 100vw, 520px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Footer field. Padded to clear the overlapping card. */}
      <div className="relative overflow-hidden bg-paper pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
          <footer>
            <div className="grid gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <Link href="/" aria-label="Beyond Social home" className="inline-flex">
                  <Logo />
                </Link>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
                  Video that looks directed, not generated. The engine handles the craft, you make
                  the calls.
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
                <p className="text-xs text-ink-soft">
                  © {year} Beyond Social. All rights reserved.
                </p>
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
      </div>
    </section>
  );
}
