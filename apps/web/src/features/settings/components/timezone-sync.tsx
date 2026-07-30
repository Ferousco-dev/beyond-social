"use client";

import { useEffect, useRef } from "react";

import { detectTimeZone } from "@/lib/time/zone";

import { saveTimeZone } from "../timezone-actions";

/**
 * Keeps the stored timezone matching the device.
 *
 * Nobody should have to pick their own timezone out of a list of six hundred.
 * The browser already knows, so it is read once and stored, and it updates
 * itself when someone travels or moves.
 *
 * Renders nothing and blocks nothing. A failed save means times are shown in the
 * previously stored zone, which is a small wrongness, not a broken page.
 */
export function TimezoneSync({ current }: { current: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    const detected = detectTimeZone();
    // Only when it actually differs: otherwise this writes to the database on
    // every dashboard load for every user, forever, to store the same string.
    if (detected === current) return;
    sent.current = true;
    void saveTimeZone({ timeZone: detected });
  }, [current]);

  return null;
}
