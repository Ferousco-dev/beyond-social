"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FEATURES } from "@/lib/marketing/landing";

import styles from "../magic-bento.module.css";
import {
  DEFAULT_PARTICLES,
  DEFAULT_SPOTLIGHT_RADIUS,
  GLOW_RGB,
  MOBILE_BREAKPOINT,
} from "./gsap-loader";
import { useCardEffects, type CardEffectOptions } from "./use-card-effects";
import { useSpotlight } from "./use-spotlight";

/** The intrinsic size of the peek screenshots in `public/app`. */
const PEEK_WIDTH = 1000;
const PEEK_HEIGHT = 579;

/**
 * The capabilities grid (ported from React Bits MagicBento to TypeScript).
 *
 * Cards light their border toward the cursor, a spotlight follows the pointer
 * across the section, and particles drift inside the hovered card. All of it is
 * decoration, so it is disabled on small screens and under
 * `prefers-reduced-motion`, and GSAP is imported dynamically only once we know
 * the effects will run, keeping it out of the mobile bundle entirely.
 */

interface MagicBentoProps {
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
}

/** True when the viewport is small or the reader has asked for less motion. */
function useAnimationsDisabled(): boolean {
  // Starts disabled so the server render and first paint never assume motion.
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    const check = (): void =>
      setDisabled(
        window.innerWidth <= MOBILE_BREAKPOINT ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return disabled;
}

function BentoCard({
  children,
  borderGlow,
  glowColor,
  effects,
}: {
  children: ReactNode;
  borderGlow: boolean;
  glowColor: string;
  effects: CardEffectOptions;
}) {
  const cardRef = useRef<HTMLElement>(null);
  useCardEffects(cardRef, effects);

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${borderGlow ? styles.borderGlow : ""}`}
      style={{ ["--glow-color" as string]: glowColor }}
    >
      {children}
    </article>
  );
}

export function MagicBento({
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  enableTilt = true,
  enableMagnetism = true,
  clickEffect = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLES,
  glowColor = GLOW_RGB,
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const disabled = useAnimationsDisabled();

  useSpotlight(gridRef, enableSpotlight && !disabled, spotlightRadius, glowColor);

  return (
    <div className={styles.grid} ref={gridRef}>
      {FEATURES.map((feature) => (
        <BentoCard
          key={feature.title}
          borderGlow={enableBorderGlow}
          glowColor={glowColor}
          effects={{
            disabled,
            particleCount: enableStars ? particleCount : 0,
            glowColor,
            enableTilt,
            enableMagnetism,
            clickEffect,
          }}
        >
          {/* Decoration, so it is hidden from assistive tech and carries no
              alt text: the card's own heading and copy already say what this
              is, and a screen reader announcing "screenshot" here would be
              noise. Eager rather than lazy because the card is short and a
              placeholder popping in mid-scroll is worse than the few kilobytes. */}
          {feature.peek ? (
            <Image
              src={feature.peek.src}
              alt=""
              aria-hidden
              width={PEEK_WIDTH}
              height={PEEK_HEIGHT}
              // Intrinsic size only: the CSS sizes it against the card. Serving
              // it optimised matters because three of these ride along with a
              // section nobody scrolled to yet.
              className={styles.peek}
            />
          ) : null}

          <span className={styles.icon}>
            <feature.icon className="size-[18px]" aria-hidden />
          </span>
          <div className={styles.content}>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.description}>{feature.description}</p>
          </div>
        </BentoCard>
      ))}
    </div>
  );
}
