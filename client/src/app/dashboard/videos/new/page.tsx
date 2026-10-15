import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = { title: "Configure video" };

/**
 * Receiver for the New Video flow. The structured generation form (PDF 5.2)
 * lands here in M5; until then it holds the brief or approved script that the
 * flow hands over, so no path ends on a dead link.
 */
export default function VideosNewPage(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configure video</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The step-by-step generation form lands here next: objective, format, script and
        speech, visual assets, then final review. Your brief and approved script are
        already saved in this browser and will be waiting.
      </p>
      <Link
        href={"/dashboard/new" as Route}
        className="mt-6 inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
      >
        Back to starting points
      </Link>
    </div>
  );
}
