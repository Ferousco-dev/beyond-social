"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { useDocumentEvent } from "@/lib/hooks/use-event";
import { useTimeout } from "@/lib/hooks/use-timers";

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

  useDocumentEvent(
    "click",
    (event) => {
      if (isInternalNavigation(event)) setNavigating(true);
    },
    true,
  );

  const [seenPath, setSeenPath] = useState(pathname);
  const [visible, setVisible] = useState(false);
  const [wasNavigating, setWasNavigating] = useState(navigating);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setNavigating(false);
  }
  if (wasNavigating !== navigating) {
    setWasNavigating(navigating);
    if (navigating) setVisible(true);
  }
  useTimeout(() => setVisible(false), !navigating && visible ? SETTLE_MS : null, navigating);

  return { navigating, visible };
}
