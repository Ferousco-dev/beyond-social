"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-reads the page a few times while a payment is still being confirmed.
 * Stripe sends the person back before its message reaches us, so the plan or
 * balance they just paid for can be a few seconds behind.
 */
export function AutoRefresh({ everyMs = 2500, times = 8 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let left = times;
    const timer = setInterval(() => {
      router.refresh();
      left -= 1;
      if (left <= 0) clearInterval(timer);
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, times]);
  return null;
}
