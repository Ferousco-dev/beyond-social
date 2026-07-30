"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what makes the app installable.
 *
 * Development is excluded on purpose: a worker that caches build output while
 * the bundler is rewriting it serves stale chunks, which looks exactly like a
 * broken app.
 *
 * Registration waits for load so it never competes with the first render for
 * bandwidth.
 */
export function ServiceWorker(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = (): void => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration costs the offline page and nothing else, so it
        // must not surface as an error to the person using the app.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
