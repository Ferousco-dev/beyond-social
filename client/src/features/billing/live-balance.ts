"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { create } from "zustand";

import { useWindowEvent } from "@/lib/hooks/use-event";
import { useLoad } from "@/lib/hooks/use-load";

import { readBalance } from "./balance-actions";

/** Sent after anything that charged or refunded credits, so every balance on screen re-reads. */
export const CREDITS_CHANGED = "bs:credits-changed";

declare global {
  interface WindowEventMap {
    "bs:credits-changed": Event;
  }
}

/** Tells the balances on screen that credits changed. Call it after any charged action, whether it worked or not. */
export function creditsChanged(): void {
  window.dispatchEvent(new Event(CREDITS_CHANGED));
}

const useBalanceStore = create<{ balance: number | null; set: (balance: number | null) => void }>((set) => ({
  balance: null,
  set: (balance) => set({ balance }),
}));

/**
 * The balance as it is now. The dashboard frame renders once and stays while
 * a person moves around, so its number went stale after every charge; this
 * re-reads it on each page change, when the tab comes back, and whenever
 * credits change.
 */
export function useLiveBalance(initial: number): number {
  const pathname = usePathname();
  const [tick, setTick] = useState(0);
  const refresh = (): void => setTick((n) => n + 1);
  useWindowEvent(CREDITS_CHANGED, refresh);
  useWindowEvent("focus", refresh);
  const read = useLoad(readBalance, `${pathname}#${tick}`);
  const live = useBalanceStore((s) => s.balance);
  const setLive = useBalanceStore((s) => s.set);
  if (read.status === "done" && read.value !== null && read.value !== live) setLive(read.value);
  return live ?? initial;
}
