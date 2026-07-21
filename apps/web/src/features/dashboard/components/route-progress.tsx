"use client";

import { cn } from "@/lib/utils";

import { useRouteProgress } from "../hooks/use-route-progress";

/**
 * Thin bar across the top of the header showing that a navigation is in
 * flight. It eases toward the end rather than reporting a real percentage,
 * because the router does not expose one.
 */
export function RouteProgress() {
  const { navigating, visible } = useRouteProgress();

  return (
    <div
      role="progressbar"
      data-state={navigating ? "loading" : visible ? "completing" : "idle"}
      aria-label="Loading page"
      aria-hidden={!visible}
      aria-valuetext={navigating ? "Loading" : "Idle"}
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
    >
      <div
        className={cn(
          "h-full bg-primary ease-out",
          navigating && "w-4/5 opacity-100 transition-[width,opacity] duration-[1200ms]",
          !navigating && visible && "w-full opacity-0 transition-[width,opacity] duration-200",
          !visible && "w-0 opacity-0",
        )}
      />
    </div>
  );
}
