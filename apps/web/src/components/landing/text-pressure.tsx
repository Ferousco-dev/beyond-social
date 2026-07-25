"use client";

import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Characters thicken as the cursor approaches (adapted from React Bits
 * TextPressure).
 *
 * Two deliberate departures from the original: it animates `font-weight` on the
 * app's existing variable font instead of pulling in Roboto Flex for the width
 * and italic axes, which keeps a decorative flourish from costing a font
 * download, and it caches character positions instead of measuring every
 * character on every frame, which would thrash layout at 60fps.
 *
 * The loop only runs while the text is on screen, on fine pointers, and never
 * under `prefers-reduced-motion`.
 */

interface TextPressureProps {
  text: string;
  className?: string;
  /** Weight applied at the cursor and at maximum distance. */
  minWeight?: number;
  maxWeight?: number;
}

export function TextPressure({
  text,
  className,
  minWeight = 200,
  maxWeight = 900,
}: TextPressureProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);
  /** Character centres relative to the container, refreshed on resize. */
  const centresRef = useRef<{ x: number; y: number }[]>([]);
  const pointerRef = useRef({ x: -9999, y: -9999 });
  const easedRef = useRef({ x: -9999, y: -9999 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    centresRef.current = charsRef.current.map((char) => {
      const rect = char.getBoundingClientRect();
      return {
        x: rect.left - base.left + rect.width / 2,
        y: rect.top - base.top + rect.height / 2,
      };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    let frame = 0;
    let running = false;

    const onPointerMove = (event: MouseEvent): void => {
      const base = container.getBoundingClientRect();
      pointerRef.current = { x: event.clientX - base.left, y: event.clientY - base.top };
    };

    const tick = (): void => {
      const eased = easedRef.current;
      const pointer = pointerRef.current;
      eased.x += (pointer.x - eased.x) / 12;
      eased.y += (pointer.y - eased.y) / 12;

      const centres = centresRef.current;
      const reach = Math.max(240, (containerRef.current?.offsetWidth ?? 0) / 3);

      charsRef.current.forEach((char, index) => {
        const centre = centres[index];
        if (!char || !centre) return;
        const distance = Math.hypot(eased.x - centre.x, eased.y - centre.y);
        const nearness = Math.max(0, 1 - distance / reach);
        char.style.fontWeight = String(Math.round(minWeight + (maxWeight - minWeight) * nearness));
      });

      frame = requestAnimationFrame(tick);
    };

    // Only burn frames while the wordmark is actually on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !running) {
          running = true;
          measure();
          window.addEventListener("mousemove", onPointerMove);
          frame = requestAnimationFrame(tick);
        } else if (!visible && running) {
          running = false;
          window.removeEventListener("mousemove", onPointerMove);
          cancelAnimationFrame(frame);
        }
      },
      { threshold: 0 },
    );
    observer.observe(container);

    const onResize = (): void => measure();
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [measure, minWeight, maxWeight]);

  return (
    <span ref={containerRef} aria-hidden className={cn("inline-flex", className)}>
      {text.split("").map((char, index) => (
        <span
          // Characters repeat, so the index is the only stable key here.
          key={`${char}-${index}`}
          ref={(element) => {
            if (element) charsRef.current[index] = element;
          }}
          className="inline-block transition-[font-weight] duration-150 ease-out"
          style={{ fontWeight: minWeight }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
