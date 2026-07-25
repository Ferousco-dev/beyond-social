"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
} from "react";

import styles from "../logo-loop.module.css";
import {
  COPY_HEADROOM,
  MIN_COPIES,
  useAnimationLoop,
  useImageLoader,
  useResizeObserver,
} from "./hooks";

/**
 * An infinite, velocity-smoothed logo marquee (ported from React Bits to
 * TypeScript). The track is duplicated enough times to cover the viewport and
 * offset with `translate3d` on every frame, so the loop is seamless and stays on
 * the compositor. Motion is suppressed under `prefers-reduced-motion`.
 */

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
