import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";

const CALENDAR = (
  <svg viewBox="0 0 320 200" className="w-full max-w-xs" role="img" aria-label="A calendar waiting for an account to be connected">
    <rect x="40" y="28" width="240" height="152" rx="18" fill="var(--paper)" stroke="var(--hairline)" strokeWidth="2" />
    <path d="M40 66h240V46a18 18 0 0 0-18-18H58a18 18 0 0 0-18 18z" fill="var(--primary)" opacity="0.14" />
    <rect x="86" y="14" width="10" height="28" rx="5" fill="var(--primary)" />
    <rect x="224" y="14" width="10" height="28" rx="5" fill="var(--primary)" />
    {[0, 1, 2, 3, 4].flatMap((col) =>
      [0, 1, 2].map((row) => {
        const picked = col === 2 && row === 1;
        return (
          <rect
            key={`${col}-${row}`}
            x={62 + col * 44}
            y={84 + row * 30}
            width="30"
            height="20"
            rx="6"
            fill={picked ? "var(--primary)" : "var(--cloud)"}
          />
        );
      }),
    )}
    <g transform="translate(240 150)">
      <circle r="24" fill="var(--paper)" stroke="var(--primary)" strokeWidth="3" />
      <path d="M0 -10v10l7 5" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/** Shown instead of empty charts or lists when no social account is connected yet. */
export function ConnectEmptyState({ art = "chart", description = "Analytics shows how your videos perform after you post them. Connect an account and your views, likes and engagement will appear here." }: { art?: "chart" | "calendar"; description?: string }): ReactNode {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-14 text-center sm:py-20">
      {art === "calendar" ? CALENDAR : <svg viewBox="0 0 320 200" className="w-full max-w-xs" role="img" aria-label="A chart waiting for an account to be connected">
        <rect x="20" y="20" width="280" height="150" rx="18" fill="var(--paper)" stroke="var(--hairline)" strokeWidth="2" />
        <path d="M44 138 L92 108 L132 120 L184 78 L232 92 L276 52" fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10" />
        <path d="M44 138 L92 108 L132 120 L184 78 L232 92 L276 52 L276 150 L44 150 Z" fill="var(--primary)" opacity="0.08" />
        {[[44, 138], [92, 108], [132, 120], [184, 78], [232, 92], [276, 52]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="var(--paper)" stroke="var(--primary)" strokeWidth="2.5" />
        ))}
        <rect x="40" y="36" width="70" height="8" rx="4" fill="var(--cloud)" />
        <rect x="40" y="52" width="40" height="6" rx="3" fill="var(--cloud)" />
        <g transform="translate(222 150)">
          <circle r="26" fill="var(--primary)" />
          <path d="M-9 0h18M0 -9v18" stroke="var(--primary-foreground)" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>}

      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Connect your social accounts</h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-3 text-ink-soft" aria-hidden>
        <PlatformLogo platform="youtube" className="size-6" />
        <PlatformLogo platform="tiktok" colour={false} className="size-6" />
        <PlatformLogo platform="instagram" className="size-6" />
      </div>

      <Link
        href={"/dashboard/settings/connections" as Route}
        className="mt-7 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Connect an account
      </Link>
    </div>
  );
}
