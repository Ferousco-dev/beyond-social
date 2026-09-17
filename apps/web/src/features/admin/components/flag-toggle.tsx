"use client";

import { useTransition } from "react";

import { setFeatureFlag } from "../actions";

/** Flag switch. The database refuses non-admin writes, so this is UI only. */
export function FlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${flagKey}`}
      disabled={pending}
      onClick={() =>
        startTransition(() => void setFeatureFlag({ key: flagKey, enabled: !enabled }))
      }
      className={`flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${
        enabled ? "justify-end border-primary bg-primary" : "justify-start border-hairline bg-cloud"
      }`}
    >
      {/*
       * Used to be an absolutely-positioned thumb pushed sideways with a fixed
       * translate-x, computed against the track's own border and size-4 width
       * lining up exactly. They didn't: the thumb rendered outside the track
       * instead of sliding inside it. Flex alignment can't have that failure
       * mode — the thumb is a normal flow child, `justify-end`/`justify-start`
       * only ever place it at one of the track's own padding edges, so nothing
       * about the thumb's position depends on getting a pixel value right.
       *
       * The shadow and ring are what the thumb still needs from the old fix:
       * without them a bg-paper thumb on a bg-cloud "off" track is two
       * near-identical dark shades in dark mode, and the switch reads as an
       * empty track with nothing on it.
       */}
      <span className="size-4 rounded-full bg-paper shadow-sm ring-1 ring-ink/10 transition-transform" />
    </button>
  );
}
