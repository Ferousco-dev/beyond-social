"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { HeaderAuthActions } from "@/features/auth/components/header-auth-actions-lazy";
import { NAV_LINKS } from "@/lib/marketing/site";
import { cn } from "@/lib/utils";

/**
 * Floating pill navigation. It sits wide and transparent over the hero, then
 * contracts into a compact frosted pill once the reader scrolls past it, so the
 * chrome shrinks out of the way as the content takes over.
 */
export function LandingHeader() {
  const [shrunk, setShrunk] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setShrunk(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5">
      <div
        className={cn(
          "w-full rounded-full border transition-all duration-500 ease-out motion-reduce:transition-none",
          shrunk
            ? "max-w-3xl border-hairline bg-paper/70 shadow-lg backdrop-blur-xl"
            : "max-w-6xl border-transparent bg-transparent",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-500 ease-out motion-reduce:transition-none",
            shrunk ? "h-12 pl-4 pr-1.5" : "h-14 px-2",
          )}
        >
          <Link href="/" aria-label="Beyond Social home" className="shrink-0">
            <Logo showWordmark={!shrunk} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 md:flex">
            {/* Signed in, this is one link to the dashboard. Inviting someone to
                "Start free" when they already have an account reads as a site
                that does not know who is looking at it. */}
            <HeaderAuthActions compact={shrunk} />
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-cloud md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-x-4 top-20 z-50 rounded-3xl border border-hairline bg-paper/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-base text-ink transition-colors hover:bg-cloud"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
            <HeaderAuthActions stacked onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
