"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * True once the element has scrolled into view, and it stays true. Sections
 * put it on `data-in` so the .ev-* scroll-in animations in globals.css play.
 */
export function useInView<T extends HTMLElement>(threshold = 0.12): readonly [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** A staggered start for one .ev-* element, in milliseconds. */
export const delay = (ms: number): CSSProperties => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;
