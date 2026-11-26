"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { HeaderAuthActions } from "@/features/auth/components/header-auth-actions-lazy";
import { useDocumentEvent, useWindowEvent } from "@/lib/hooks/use-event";
import { useBodyScrollLock } from "@/lib/hooks/use-page-effects";
import { NAV_LINKS } from "@/lib/marketing/site";
import { cn } from "@/lib/utils";

/** Scroll moves smaller than this are trackpad jitter, so the bar does not flicker. */
const JITTER = 6;

/** Two lines that cross into an X, from the EcoVest menu button. */
function Burger({ open }: { open: boolean }): ReactNode {
  const bar = "absolute left-1/2 h-[1.5px] w-[20px] -translate-x-1/2 rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]";
  return (
    <span aria-hidden="true" className="relative block h-5 w-5">
      <span className={cn(bar, "top-[6px]", open && "translate-y-[3.5px] rotate-45")} />
      <span className={cn(bar, "top-[13px]", open && "-translate-y-[3.5px] -rotate-45")} />
    </span>
  );
}

/**
 * The landing navigation, from the owner's EcoVest site. A fixed bar that
 * blends into the hero, turns solid once the page scrolls, hides while you
 * scroll down and comes back on any scroll up. On phones and tablets the menu
 * opens full screen with large links. The buttons are our own.
 */
export function LandingHeader(): ReactNode {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const header = useRef<HTMLElement>(null);
  useBodyScrollLock(open);

  useWindowEvent(
    "scroll",
    () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const moved = y - lastY.current;
      if (Math.abs(moved) < JITTER) return;
      setHidden(moved > 0 && y > (header.current?.offsetHeight ?? 80));
      lastY.current = y;
    },
    { passive: true },
  );
  useDocumentEvent("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  useWindowEvent("resize", () => {
    if (window.innerWidth >= 1024) setOpen(false);
  });

  return (
    <>
      <header
        ref={header}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,transform] duration-300 ease-out motion-reduce:transition-none",
          scrolled || open ? "bg-paper shadow-[0_1px_0_rgba(16,20,30,0.06)]" : "bg-transparent",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <nav aria-label="Main" className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 pb-[14px] pt-5 md:px-10 md:pt-6 xl:px-[100px]">
          <Link href="/" aria-label="Beyond Social home" className="flex items-center">
            <Logo />
          </Link>

          <ul className="absolute left-1/2 top-[calc(50%+5px)] hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="whitespace-nowrap text-[16px] font-medium leading-[1.5] tracking-[-0.02em] text-ink transition-colors hover:text-primary">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <HeaderAuthActions />
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 grid h-11 w-11 cursor-pointer place-items-center rounded-full transition-colors hover:bg-cloud lg:hidden"
          >
            <Burger open={open} />
          </button>
        </nav>
      </header>

      <div
        id="landing-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-paper pt-[76px] transition-opacity duration-300 ease-out lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="flex flex-1 flex-col px-5 pb-8 pt-4 md:px-10">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link, i) => (
              <li
                key={link.label}
                className={cn("transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
                style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
              >
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex h-[68px] items-center border-b border-ink/[0.07] text-[32px] font-medium tracking-[-0.035em] text-ink [font-family:var(--font-landing-display)]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div
            className={cn("mt-auto flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0")}
            style={{ transitionDelay: open ? `${80 + NAV_LINKS.length * 50}ms` : "0ms" }}
          >
            <HeaderAuthActions stacked onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </>
  );
}
