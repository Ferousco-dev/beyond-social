"use client";

import { useEffect, type RefObject } from "react";

import { loadGsap } from "./gsap-loader";

/** Tracks the pointer across the section and lights nearby card borders. */
export function useSpotlight(
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
