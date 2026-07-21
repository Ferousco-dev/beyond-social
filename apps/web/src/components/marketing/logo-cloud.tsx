import { type ReactNode } from "react";

import { PLATFORMS } from "@/lib/marketing/site";

// Duplicated so the track can loop seamlessly under the marquee animation.
const TRACK = [...PLATFORMS, ...PLATFORMS];

export function LogoCloud(): ReactNode {
  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Publish natively to the platforms your audience already lives on
        </p>
        <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <ul className="flex w-max items-center gap-x-14 pr-14 motion-safe:animate-marquee">
            {TRACK.map((platform, index) => (
              <li
                key={`${platform}-${index}`}
                className="whitespace-nowrap text-lg font-semibold tracking-tight text-foreground/70"
                aria-hidden={index >= PLATFORMS.length}
              >
                {platform}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
