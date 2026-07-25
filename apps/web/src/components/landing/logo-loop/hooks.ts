"use client";

import { useEffect, useRef, type RefObject } from "react";

const SMOOTH_TAU = 0.25;
const MIN_COPIES = 2;
const COPY_HEADROOM = 2;

export { MIN_COPIES, COPY_HEADROOM };

export function useResizeObserver(
  callback: () => void,
  elements: readonly RefObject<HTMLElement | null>[],
): void {
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", callback);
      callback();
      return () => window.removeEventListener("resize", callback);
    }
    const observers = elements.map((ref) => {
      if (!ref.current) return null;
      const observer = new ResizeObserver(callback);
      observer.observe(ref.current);
      return observer;
    });
    callback();
    return () => observers.forEach((observer) => observer?.disconnect());
  }, [callback, elements]);
}

/** Images change the sequence width once decoded, so remeasure when they land. */
export function useImageLoader(seqRef: RefObject<HTMLElement | null>, onLoad: () => void): void {
  useEffect(() => {
    const images = seqRef.current?.querySelectorAll("img") ?? [];
    if (images.length === 0) {
      onLoad();
      return;
    }
    let remaining = images.length;
    const handle = (): void => {
      remaining -= 1;
      if (remaining === 0) onLoad();
    };
    images.forEach((img) => {
      if (img.complete) handle();
      else {
        img.addEventListener("load", handle, { once: true });
        img.addEventListener("error", handle, { once: true });
      }
    });
    return () =>
      images.forEach((img) => {
        img.removeEventListener("load", handle);
        img.removeEventListener("error", handle);
      });
  }, [onLoad, seqRef]);
}

export function useAnimationLoop(
  trackRef: RefObject<HTMLDivElement | null>,
  targetVelocity: number,
  seqSize: number,
  isHovered: boolean,
  hoverSpeed: number | undefined,
  isVertical: boolean,
): void {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const apply = (offset: number): void => {
      track.style.transform = isVertical
        ? `translate3d(0, ${-offset}px, 0)`
        : `translate3d(${-offset}px, 0, 0)`;
    };

    if (seqSize > 0) {
      offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize;
      apply(offsetRef.current);
    }

    const animate = (timestamp: number): void => {
      lastRef.current ??= timestamp;
      const delta = Math.max(0, timestamp - lastRef.current) / 1000;
      lastRef.current = timestamp;

      const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;
      // Exponential smoothing, so speed changes ease instead of snapping.
      velocityRef.current += (target - velocityRef.current) * (1 - Math.exp(-delta / SMOOTH_TAU));

      if (seqSize > 0) {
        const next = offsetRef.current + velocityRef.current * delta;
        offsetRef.current = ((next % seqSize) + seqSize) % seqSize;
        apply(offsetRef.current);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [targetVelocity, seqSize, isHovered, hoverSpeed, isVertical, trackRef]);
}
