"use client";

import { useEffect, useState } from "react";

import { formatAge } from "@/lib/health/format";

/**
 * When the numbers above were taken, from the database clock.
 *
 * The absolute time is rendered in UTC so the server and client agree on the
 * string and an operator comparing this against a log is comparing like with
 * like. The age ticks, because a stale panel that looks fresh is the failure
 * this component exists to prevent.
 */
export function ObservedAt({ at }: { at: Date }) {
  const [age, setAge] = useState(() => formatAge(at, at));

  useEffect(() => {
    const tick = () => setAge(formatAge(at, new Date()));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [at]);

  const iso = at.toISOString();

  return (
    <p className="text-xs text-ink-soft tabular-nums">
      as of <time dateTime={iso}>{iso.slice(11, 19)} UTC</time>
      <span className="text-ink-soft/70"> · {age} ago</span>
    </p>
  );
}
