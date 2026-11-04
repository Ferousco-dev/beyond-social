"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Held briefly at the end so a fast navigation still reads as a completed pass. */
const SETTLE_MS = 220;

function isInternalNavigation(event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const link = target.closest("a");
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return false;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  return link.origin === window.location.origin && link.pathname !== window.location.pathname;
}

/**
 * True from the moment an in-app link is clicked until the new route has
 * rendered, so the header can show how far along the navigation is.
 */
export interface RouteProgress {
  /** A navigation is still in flight, so the bar should keep advancing. */
  readonly navigating: boolean;
  /** The bar is on screen, including the brief completing pass. */
  readonly visible: boolean;
}

export function useRouteProgress(): RouteProgress {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (isInternalNavigation(event)) setNavigating(true);
    };
    // Capture phase: Link calls preventDefault in its own handler, which would
    // otherwise run first and make every navigation look cancelled.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The new pathname means the destination has rendered.
  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (navigating) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [navigating]);

  return { navigating, visible };
}
