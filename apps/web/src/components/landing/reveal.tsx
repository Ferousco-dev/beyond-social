"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type State = "initial" | "hidden" | "shown";

/**
 * Reveals its children as they scroll into view.
 *
 * Progressive enhancement is deliberate: the server renders the "initial" state,
 * which is fully visible, so the page is complete without JavaScript and for
 * crawlers. Only after mount does an element that is still below the fold get
 * hidden and then animated in, which is invisible to the reader because they
 * cannot see it yet. Content already in view stays put, so nothing flashes and
 * the first paint is never animated. Reduced motion skips the effect entirely.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger in milliseconds, for sequencing siblings. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("initial");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const belowFold = node.getBoundingClientRect().top > window.innerHeight * 0.9;
    if (reduced || !belowFold || typeof IntersectionObserver === "undefined") {
      setState("shown");
      return;
    }

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("shown");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={state === "shown" && delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "motion-reduce:transition-none",
        state === "hidden" && "translate-y-4 opacity-0",
        state === "shown" && "translate-y-0 opacity-100 transition-all duration-700 ease-out",
        className,
      )}
    >
      {children}
    </div>
  );
}
