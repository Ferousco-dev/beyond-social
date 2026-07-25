"use client";

// Type-only import: erased at build time, so GSAP itself stays lazily loaded.
import type { gsap as GsapNamespace } from "gsap";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { FEATURES } from "@/lib/marketing/landing";

import styles from "./magic-bento.module.css";

/**
 * The capabilities grid (ported from React Bits MagicBento to TypeScript).
 *
 * Cards light their border toward the cursor, a spotlight follows the pointer
 * across the section, and particles drift inside the hovered card. All of it is
 * decoration, so it is disabled on small screens and under
 * `prefers-reduced-motion`, and GSAP is imported dynamically only once we know
 * the effects will actually run, keeping it out of the mobile bundle entirely.
 */

const MOBILE_BREAKPOINT = 768;
const DEFAULT_PARTICLES = 8;
const DEFAULT_SPOTLIGHT_RADIUS = 320;
/** Brand accent as raw RGB channels, so it can be composed into rgba(). */
const GLOW_RGB = "59, 130, 246";

type Gsap = typeof GsapNamespace;

let gsapLoader: Promise<Gsap> | null = null;

/** Loads GSAP at most once, on demand. */
function loadGsap(): Promise<Gsap> {
  gsapLoader ??= import("gsap").then((module) => module.gsap);
  return gsapLoader;
}

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

function createParticle(x: number, y: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(${color},0.9);box-shadow:0 0 6px rgba(${color},0.5);pointer-events:none;z-index:3;left:${x}px;top:${y}px;`;
  return el;
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

interface CardEffectOptions {
  disabled: boolean;
  particleCount: number;
  glowColor: string;
  enableTilt: boolean;
  enableMagnetism: boolean;
  clickEffect: boolean;
}

/** Wires the per-card pointer effects once GSAP has loaded. */
function useCardEffects(cardRef: RefObject<HTMLElement | null>, options: CardEffectOptions): void {
  const { disabled, particleCount, glowColor, enableTilt, enableMagnetism, clickEffect } = options;

  useEffect(() => {
    const element = cardRef.current;
    if (!element || disabled) return;

    let disposed = false;
    let detach: (() => void) | null = null;

    void loadGsap().then((gsap) => {
      if (disposed) return;

      const spawned: HTMLDivElement[] = [];
      const timeouts: number[] = [];
      let hovered = false;

      const clearParticles = (): void => {
        timeouts.forEach(window.clearTimeout);
        timeouts.length = 0;
        spawned.forEach((particle) =>
          gsap.to(particle, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: "back.in(1.7)",
            onComplete: () => particle.remove(),
          }),
        );
        spawned.length = 0;
      };

      const onEnter = (): void => {
        hovered = true;
        const { width, height } = element.getBoundingClientRect();
        for (let i = 0; i < particleCount; i++) {
          timeouts.push(
            window.setTimeout(() => {
              if (!hovered) return;
              const particle = createParticle(
                Math.random() * width,
                Math.random() * height,
                glowColor,
              );
              element.appendChild(particle);
              spawned.push(particle);
              gsap.fromTo(
                particle,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" },
              );
              gsap.to(particle, {
                x: (Math.random() - 0.5) * 80,
                y: (Math.random() - 0.5) * 80,
                duration: 2 + Math.random() * 2,
                ease: "none",
                repeat: -1,
                yoyo: true,
              });
            }, i * 90),
          );
        }
      };

      const onLeave = (): void => {
        hovered = false;
        clearParticles();
        gsap.to(element, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
      };

      const onMove = (event: MouseEvent): void => {
        if (!enableTilt && !enableMagnetism) return;
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        gsap.to(element, {
          ...(enableTilt
            ? {
                rotateX: ((y - centerY) / centerY) * -4,
                rotateY: ((x - centerX) / centerX) * 4,
                transformPerspective: 1000,
              }
            : {}),
          ...(enableMagnetism ? { x: (x - centerX) * 0.02, y: (y - centerY) * 0.02 } : {}),
          duration: 0.3,
          ease: "power2.out",
        });
      };

      const onClick = (event: MouseEvent): void => {
        if (!clickEffect) return;
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const maxDistance = Math.max(
          Math.hypot(x, y),
          Math.hypot(x - rect.width, y),
          Math.hypot(x, y - rect.height),
          Math.hypot(x - rect.width, y - rect.height),
        );

        const ripple = document.createElement("div");
        ripple.style.cssText = `position:absolute;width:${maxDistance * 2}px;height:${maxDistance * 2}px;border-radius:50%;background:radial-gradient(circle, rgba(${glowColor},0.25) 0%, rgba(${glowColor},0.1) 30%, transparent 70%);left:${x - maxDistance}px;top:${y - maxDistance}px;pointer-events:none;z-index:3;`;
        element.appendChild(ripple);
        gsap.fromTo(
          ripple,
          { scale: 0, opacity: 1 },
          {
            scale: 1,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => ripple.remove(),
          },
        );
      };

      element.addEventListener("mouseenter", onEnter);
      element.addEventListener("mouseleave", onLeave);
      element.addEventListener("mousemove", onMove);
      element.addEventListener("click", onClick);

      detach = () => {
        hovered = false;
        element.removeEventListener("mouseenter", onEnter);
        element.removeEventListener("mouseleave", onLeave);
        element.removeEventListener("mousemove", onMove);
        element.removeEventListener("click", onClick);
        clearParticles();
      };
    });

    return () => {
      disposed = true;
      detach?.();
    };
  }, [cardRef, disabled, particleCount, glowColor, enableTilt, enableMagnetism, clickEffect]);
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

/** Tracks the pointer across the section and lights nearby card borders. */
function useSpotlight(
  gridRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  radius: number,
  glowColor: string,
): void {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !enabled) return;

    let disposed = false;
    let detach: (() => void) | null = null;

    void loadGsap().then((gsap) => {
      if (disposed) return;

      const spotlight = document.createElement("div");
      spotlight.style.cssText = `position:fixed;width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;pointer-events:none;background:radial-gradient(circle, rgba(${glowColor},0.10) 0%, rgba(${glowColor},0.04) 25%, transparent 70%);z-index:5;opacity:0;transform:translate(-50%,-50%);`;
      document.body.appendChild(spotlight);

      const proximity = radius * 0.5;
      const fadeDistance = radius * 0.75;

      const onMove = (event: MouseEvent): void => {
        const rect = grid.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        const cards = grid.querySelectorAll<HTMLElement>("article");
        if (!inside) {
          gsap.to(spotlight, { opacity: 0, duration: 0.3 });
          cards.forEach((card) => card.style.setProperty("--glow-intensity", "0"));
          return;
        }

        let minDistance = Infinity;
        cards.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const distance = Math.max(
            0,
            Math.hypot(
              event.clientX - (cardRect.left + cardRect.width / 2),
              event.clientY - (cardRect.top + cardRect.height / 2),
            ) -
              Math.max(cardRect.width, cardRect.height) / 2,
          );
          minDistance = Math.min(minDistance, distance);

          const intensity =
            distance <= proximity
              ? 1
              : distance <= fadeDistance
                ? (fadeDistance - distance) / (fadeDistance - proximity)
                : 0;

          card.style.setProperty(
            "--glow-x",
            `${((event.clientX - cardRect.left) / cardRect.width) * 100}%`,
          );
          card.style.setProperty(
            "--glow-y",
            `${((event.clientY - cardRect.top) / cardRect.height) * 100}%`,
          );
          card.style.setProperty("--glow-intensity", intensity.toString());
          card.style.setProperty("--glow-radius", `${radius}px`);
        });

        gsap.to(spotlight, { left: event.clientX, top: event.clientY, duration: 0.1 });
        gsap.to(spotlight, { opacity: minDistance <= fadeDistance ? 0.7 : 0, duration: 0.2 });
      };

      document.addEventListener("mousemove", onMove);
      detach = () => {
        document.removeEventListener("mousemove", onMove);
        spotlight.remove();
      };
    });

    return () => {
      disposed = true;
      detach?.();
    };
  }, [gridRef, enabled, radius, glowColor]);
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
