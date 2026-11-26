"use client";

import { useState, type ReactNode } from "react";

import { useDocumentEvent, useWindowEvent } from "@/lib/hooks/use-event";
import { useOnMount } from "@/lib/hooks/use-page-effects";
import { useTimeout } from "@/lib/hooks/use-timers";

import { checkEverySeconds, isDown, nextFailures } from "@/lib/service-health";

/** Whether our side answers. A person with no connection is told so elsewhere, so offline counts as fine here. */
async function serviceAnswers(): Promise<boolean> {
  if (!navigator.onLine) return true;
  try {
    const response = await fetch("/api/service-status", { cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    return response.ok && typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
  } catch {
    return false;
  }
}

/**
 * A red bar across the top while the service behind the app is not answering:
 * the server, its database or sign-in. It checks quietly in the background,
 * waits for two failures in a row before showing, and goes away by itself once
 * things answer again. Being offline is a different problem and has its own notice.
 */
export function ServiceBanner(): ReactNode {
  const [failures, setFailures] = useState(0);

  const [checks, setChecks] = useState(0);

  async function check(): Promise<void> {
    const ok = await serviceAnswers();
    setFailures((count) => nextFailures(count, ok));
    setChecks((done) => done + 1);
  }

  function wake(): void {
    if (document.visibilityState === "visible") void check();
  }

  useOnMount(() => void check());
  useTimeout(() => void check(), checks > 0 ? checkEverySeconds(failures) * 1000 : null, checks);
  useDocumentEvent("visibilitychange", wake);
  useWindowEvent("online", wake);

  if (!isDown(failures)) return null;
  return (
    <div role="alert" className="sticky top-0 z-50 w-full bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white">
      We are experiencing an issue on our end. Please try again later.
    </div>
  );
}
