import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { ScheduleCalendar } from "@/features/schedule/schedule-calendar";
import { goApi } from "@/lib/go-api/client";
import { postsResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function SchedulePage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/posts?limit=100", postsResponse);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Schedule</h1>
      <p className="mt-1 text-sm text-ink-soft">
        See scheduled and published videos by day, and track publishing status for connected accounts.
      </p>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.message}
        </p>
      ) : (
        <>
          {result.data.data.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-hairline p-4">
              <p className="text-sm text-ink-soft">Nothing is scheduled yet. Connect an account to get started.</p>
              <Link href="/dashboard/connections" className="mt-2 inline-flex text-sm font-medium text-primary underline underline-offset-2">
                Connect a social account
              </Link>
            </div>
          ) : null}
          <ScheduleCalendar posts={result.data.data} />
          <p className="mt-5 text-xs leading-relaxed text-ink-soft">
            Posts can be cancelled before publishing. Rescheduling and editing scheduled posts are not available yet.
          </p>
        </>
      )}
    </div>
  );
}
