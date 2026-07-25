import Link from "next/link";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { InstagramIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/brand/social-icons";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@/lib/marketing/site";

const ICONS: Record<string, (props: { className?: string }) => ReactNode> = {
  TikTok: TikTokIcon,
  Instagram: InstagramIcon,
  YouTube: YouTubeIcon,
  X: XIcon,
};

/** Site footer. Quiet, structured, and out of the way. */
export function LandingFooter(): ReactNode {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-hairline pt-14">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" aria-label="Beyond Social home">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              Video that looks directed, not generated.
            </p>
            <ul className="mt-5 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => {
                const Icon = ICONS[social.label];
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.label}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors hover:border-ink-soft/40 hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {Icon ? <Icon className="size-4" /> : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-hairline py-6 sm:flex-row">
          <p className="text-xs text-ink-soft">© {year} Beyond Social. All rights reserved.</p>
          <p className="text-xs text-ink-soft">Built for creators who care how it looks.</p>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the viewport edge as a brand sign-off. */}
      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center text-[19vw] font-semibold leading-[0.75] tracking-[-0.04em] text-ink/[0.04]"
      >
        Beyond Social
      </p>
    </footer>
  );
}
