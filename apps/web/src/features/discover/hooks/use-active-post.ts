"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Which card the scroller is currently on.
 *
 * An observer rather than a scroll handler: scroll fires continuously and would
 * have us recomputing positions on every frame, where this reports only when a
 * card actually crosses into view.
 *
 * Nothing auto-plays. The active card is the one that gets a player mounted, but
 * whether it starts is TikTok's business and the user's, not ours: a feed that
 * begins making noise on its own is the thing people mute the tab over.
 */
export function useActivePost(count: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || count === 0) return;

    const cards = [...container.querySelectorAll<HTMLElement>("[data-post-index]")];

    const observer = new IntersectionObserver(
      (entries) => {
        // The most visible entry wins, so a card half-scrolled past does not
        // take over from the one filling the viewport.
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;

        const index = Number(best.target.getAttribute("data-post-index"));
        if (Number.isInteger(index)) setActiveIndex(index);
      },
      // Halfway is the threshold for "this is the one being looked at", and the
      // root is the scroller rather than the window because the page itself
      // does not move.
      { root: container, threshold: [0.5, 0.75, 1] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [count]);

  return { containerRef, activeIndex, setActiveIndex };
}
