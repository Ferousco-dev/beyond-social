"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
  type RefObject,
} from "react";

import styles from "./logo-loop.module.css";

/**
 * An infinite, velocity-smoothed logo marquee (ported from React Bits to
 * TypeScript). The track is duplicated enough times to cover the viewport and
 * offset with `translate3d` on every frame, so the loop is seamless and stays on
 * the compositor. Motion is suppressed under `prefers-reduced-motion`.
 */

const SMOOTH_TAU = 0.25;
const MIN_COPIES = 2;
const COPY_HEADROOM = 2;

export type LogoItem =
  | { node: ReactNode; title?: string; href?: string; ariaLabel?: string }
  | { src: string; alt?: string; title?: string; href?: string; width?: number; height?: number };

export interface LogoLoopProps {
  logos: readonly LogoItem[];
  /** Pixels per second. */
  speed?: number;
  direction?: "left" | "right" | "up" | "down";
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  /** Velocity while hovered; 0 pauses. Omit to keep the base speed. */
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const toCssLength = (value: number | string | undefined): string | undefined =>
  typeof value === "number" ? `${value}px` : value;

/** Recomputes on element resize, falling back to window resize. */
function useResizeObserver(
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
function useImageLoader(seqRef: RefObject<HTMLElement | null>, onLoad: () => void): void {
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

function useAnimationLoop(
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

export const LogoLoop = memo(function LogoLoop({
  logos,
  speed = 120,
  direction = "left",
  width = "100%",
  logoHeight = 28,
  gap = 32,
  hoverSpeed = 0,
  fadeOut = false,
  fadeOutColor,
  scaleOnHover = false,
  ariaLabel = "Partner logos",
  className,
  style,
}: LogoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLUListElement>(null);

  const [seqSize, setSeqSize] = useState(0);
  const [copyCount, setCopyCount] = useState(MIN_COPIES);
  const [isHovered, setIsHovered] = useState(false);

  const isVertical = direction === "up" || direction === "down";

  const targetVelocity = useMemo(() => {
    const magnitude = Math.abs(speed);
    const towardStart = direction === "left" || direction === "up";
    return magnitude * (towardStart ? 1 : -1) * (speed < 0 ? -1 : 1);
  }, [speed, direction]);

  const updateDimensions = useCallback(() => {
    const rect = seqRef.current?.getBoundingClientRect();
    const sequence = isVertical ? (rect?.height ?? 0) : (rect?.width ?? 0);
    if (sequence <= 0) return;
    const viewport = isVertical
      ? (containerRef.current?.clientHeight ?? 0)
      : (containerRef.current?.clientWidth ?? 0);
    setSeqSize(Math.ceil(sequence));
    setCopyCount(Math.max(MIN_COPIES, Math.ceil(viewport / sequence) + COPY_HEADROOM));
  }, [isVertical]);

  const observed = useMemo(() => [containerRef, seqRef], []);
  useResizeObserver(updateDimensions, observed);
  useImageLoader(seqRef, updateDimensions);
  useAnimationLoop(trackRef, targetVelocity, seqSize, isHovered, hoverSpeed, isVertical);

  const rootClassName = [
    styles.loop,
    isVertical ? styles.vertical : undefined,
    fadeOut ? styles.fade : undefined,
    scaleOnHover ? styles.scaleHover : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const containerStyle: CSSProperties = {
    width: isVertical ? undefined : (toCssLength(width) ?? "100%"),
    ["--logoloop-gap" as string]: `${gap}px`,
    ["--logoloop-logoHeight" as string]: `${logoHeight}px`,
    ...(fadeOutColor ? { ["--logoloop-fadeColor" as string]: fadeOutColor } : {}),
    ...style,
  };

  const renderItem = (item: LogoItem, key: Key): ReactNode => {
    const isNode = "node" in item;
    const content = isNode ? (
      <span className={styles.node}>{item.node}</span>
    ) : (
      // Remote logos are plain <img>: they are tiny, already optimised, and do
      // not benefit from the image pipeline inside a duplicated marquee track.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.src}
        alt={item.alt ?? ""}
        title={item.title}
        width={item.width}
        height={item.height}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
    const label = isNode ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title);

    return (
      <li className={styles.item} key={key}>
        {item.href ? (
          <a
            className={styles.link}
            href={item.href}
            aria-label={label ?? "Logo link"}
            target="_blank"
            rel="noreferrer noopener"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      className={rootClassName}
      style={containerStyle}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className={styles.track}
        ref={trackRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {Array.from({ length: copyCount }, (_, copyIndex) => (
          <ul
            className={styles.list}
            key={`copy-${copyIndex}`}
            aria-hidden={copyIndex > 0}
            ref={copyIndex === 0 ? seqRef : undefined}
          >
            {logos.map((item, itemIndex) => renderItem(item, `${copyIndex}-${itemIndex}`))}
          </ul>
        ))}
      </div>
    </div>
  );
});
