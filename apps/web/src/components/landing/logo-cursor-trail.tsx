"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drops the brand mark along the pointer's path inside its container, each one
 * fading and drifting away (adapted from React Bits TextCursor).
 *
 * Implemented with a CSS keyframe rather than an animation library: the effect
 * is a fade plus a small drift, which CSS does natively, so it costs nothing in
 * bundle size. Marks are only spawned on fine pointers and never under
 * `prefers-reduced-motion`.
 */

interface TrailMark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

const SPACING = 90;
const MAX_MARKS = 6;
const LIFETIME_MS = 1100;

export function LogoCursorTrail({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<TrailMark[]>([]);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const idRef = useRef(0);
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /** Retires a mark once its animation has finished. */
  const scheduleRemoval = useCallback((id: number) => {
    window.setTimeout(
      () => setMarks((current) => current.filter((mark) => mark.id !== id)),
      LIFETIME_MS,
    );
  }, []);

  // Listens on the window and bounds-checks, so the overlay can sit above the
  // card content while still ignoring pointer events itself.
  useEffect(() => {
    const onMove = (event: MouseEvent): void => {
      const container = containerRef.current;
      if (!enabledRef.current || !container) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      if (!inside) {
        lastRef.current = null;
        return;
      }

      const last = lastRef.current;
      if (!last) {
        lastRef.current = { x, y };
        return;
      }

      const dx = x - last.x;
      const dy = y - last.y;
      if (Math.hypot(dx, dy) < SPACING) return;

      lastRef.current = { x, y };
      const id = idRef.current++;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      setMarks((current) => [...current, { id, x, y, angle }].slice(-MAX_MARKS));
      scheduleRemoval(id);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [scheduleRemoval]);

  return (
    <div ref={containerRef} aria-hidden className={className}>
      {marks.map((mark) => (
        <span
          key={mark.id}
          className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 animate-[trail-fade_1.1s_ease-out_forwards]"
          style={{ left: mark.x, top: mark.y, rotate: `${mark.angle}deg` }}
        >
          <Image
            src="/brand/logo-mark-dark.png"
            alt=""
            width={64}
            height={64}
            className="size-full object-contain opacity-80"
          />
        </span>
      ))}
    </div>
  );
}
