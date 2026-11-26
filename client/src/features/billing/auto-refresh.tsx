"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useInterval } from "@/lib/hooks/use-timers";

/**
 * Re-reads the page a few times while a payment is still being confirmed.
 * Stripe sends the person back before its message reaches us, so the plan or
 * balance they just paid for can be a few seconds behind.
 */
export function AutoRefresh({
  everyMs = 2500,
  times = 8,
}: {
  everyMs?: number;
  times?: number;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(times);
  useInterval(
    () => {
      router.refresh();
      setLeft((count) => count - 1);
    },
    left > 0 ? everyMs : null,
  );
  return null;
}
