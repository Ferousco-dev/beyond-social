"use client";

import { useEffect, useState } from "react";

import { quoteScene } from "@/features/studio/assist-actions";

import { partSeconds } from "./long-video";
import { LENGTHS, LONG_LENGTHS } from "./pacing";

// Prices change rarely, so one answer per length serves the whole visit and
// every step that shows a cost reads it without waiting again.
const cache = new Map<string, Promise<number | null>>();

export function cachedSceneQuote(seconds: number, sound = false): Promise<number | null> {
  const id = `${seconds}:${sound}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const pending = quoteScene(seconds, sound).catch(() => null);
  cache.set(id, pending);
  // A failed quote is not kept, so the next look asks again.
  void pending.then((credits) => {
    if (credits === null) cache.delete(id);
  });
  return pending;
}

/** A long video costs the sum of its clips, each quoted at its own length. */
export async function cachedLongQuote(totalSeconds: number, sound = false): Promise<number | null> {
  const quotes = await Promise.all(partSeconds(totalSeconds).map((seconds) => cachedSceneQuote(seconds, sound)));
  return quotes.some((quote) => quote === null) ? null : quotes.reduce<number>((sum, quote) => sum + (quote ?? 0), 0);
}

/** The credit cost of every offered length, fetched together in the background. */
export function useSceneQuotes(sound = false): Readonly<Record<number, number | null>> {
  const [quotes, setQuotes] = useState<Readonly<Record<number, number | null>>>({});

  useEffect(() => {
    let active = true;
    for (const length of [...LENGTHS, ...LONG_LENGTHS]) {
      void (length > 15 ? cachedLongQuote(length, sound) : cachedSceneQuote(length, sound)).then((credits) => {
        if (active) setQuotes((current) => ({ ...current, [length]: credits }));
      });
    }
    return () => {
      active = false;
    };
  }, [sound]);

  return quotes;
}
