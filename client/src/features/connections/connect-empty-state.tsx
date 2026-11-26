import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { EmptyArt } from "@/components/ui/empty-art";

/** Shown instead of empty charts or lists when no social account is connected yet. */
export function ConnectEmptyState({ art = "chart", description = "Analytics shows how your videos perform after you post them. Connect an account and your views, likes and engagement will appear here." }: { art?: "chart" | "calendar"; description?: string }): ReactNode {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-14 text-center sm:py-20">
      <EmptyArt name={art === "calendar" ? "schedule" : "analytics"} />

      <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">Connect your social accounts</h1>
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
        className="btn btn-primary btn-md mt-7"
      >
        Connect an account
      </Link>
    </div>
  );
}
