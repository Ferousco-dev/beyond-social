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
    if (!("serviceWorker" in navigator)) return;

    /*
     * Development actively removes one rather than merely not adding one.
     *
     * Not registering in development was not enough. A worker installed once by
     * a local production build keeps serving that build's chunks on the same
     * origin forever, through restarts and through deleting the bundler's
     * output, because the worker answers before the dev server is ever asked.
     *
     * The symptom is a black page and `originalFactory.call` being undefined,
     * which reads as a broken bundle rather than as a cache, so it costs an
     * afternoon of clearing the wrong things. Whoever hits it should not have
     * to know that service workers outlive the thing that installed them.
     */
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        if (registrations.length === 0) return;
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        // The page already holds the stale worker's assets, so it has to be
        // fetched again for the unregistering to be visible.
        window.location.reload();
      });
      return;
    }

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
