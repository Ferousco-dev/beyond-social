"use client";

import { type ReactNode } from "react";

/** A reset time in the viewer's own time zone. */
export function ResetTime({ at }: { readonly at: string }): ReactNode {
  const date = new Date(at);
  return (
    <time dateTime={at} suppressHydrationWarning>
      {date.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
    </time>
  );
}
