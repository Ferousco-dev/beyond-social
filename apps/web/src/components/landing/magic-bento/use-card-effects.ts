"use client";

import { useEffect, type RefObject } from "react";

import { loadGsap } from "./gsap-loader";

export interface CardEffectOptions {
  disabled: boolean;
  particleCount: number;
  glowColor: string;
  enableTilt: boolean;
  enableMagnetism: boolean;
  clickEffect: boolean;
}

function createParticle(x: number, y: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(${color},0.9);box-shadow:0 0 6px rgba(${color},0.5);pointer-events:none;z-index:3;left:${x}px;top:${y}px;`;
  return el;
}

/** Wires the per-card pointer effects once GSAP has loaded. */
export function useCardEffects(
  cardRef: RefObject<HTMLElement | null>,
  options: CardEffectOptions,
): void {
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
