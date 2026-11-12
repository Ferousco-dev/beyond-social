"use client";

import { useEffect, useState } from "react";

import { quoteScene } from "@/features/studio/assist-actions";

import { LENGTHS } from "./pacing";

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

/** The credit cost of every offered length, fetched together in the background. */
export function useSceneQuotes(sound = false): Readonly<Record<number, number | null>> {
  const [quotes, setQuotes] = useState<Readonly<Record<number, number | null>>>({});

  useEffect(() => {
    let active = true;
    for (const length of LENGTHS) {
      void cachedSceneQuote(length, sound).then((credits) => {
        if (active) setQuotes((current) => ({ ...current, [length]: credits }));
      });
    }
    return () => {
      active = false;
    };
  }, [sound]);

  return quotes;
}
