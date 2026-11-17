"use client";

import { useEffect, useState, type ReactNode } from "react";

import { checkEverySeconds, isDown, nextFailures } from "@/lib/service-health";

/**
 * A red bar across the top while the service behind the app is not answering:
 * the server, its database or sign-in. It checks quietly in the background,
 * waits for two failures in a row before showing, and goes away by itself once
 * things answer again. Being offline is a different problem and has its own notice.
 */
export function ServiceBanner(): ReactNode {
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;

    const check = async (): Promise<void> => {
      let ok = true;
      // A person with no connection is told so elsewhere; this is about our side.
      if (navigator.onLine) {
        try {
          const response = await fetch("/api/service-status", { cache: "no-store" });
          const body: unknown = await response.json().catch(() => null);
          ok = response.ok && typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
        } catch {
          ok = false;
        }
      }
      if (stopped) return;
      count = nextFailures(count, ok);
      setFailures(count);
      schedule();
    };

    const schedule = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => void check(), checkEverySeconds(count) * 1000);
    };

    const wake = (): void => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void check();
      }
    };

    void check();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, []);

  if (!isDown(failures)) return null;
  return (
    <div role="alert" className="sticky top-0 z-50 w-full bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white">
      We are experiencing an issue on our end. Please try again later.
    </div>
  );
}
