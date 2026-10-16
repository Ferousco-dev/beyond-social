import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

import { PostRow } from "@/features/schedule/post-row";
import { ScheduleCalendar } from "@/features/schedule/schedule-calendar";
import { goApi } from "@/lib/go-api/client";
import { postsResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function SchedulePage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/posts?limit=100", postsResponse);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Schedule</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Videos going out to your accounts. Create a video, then schedule it here for the time it should go out.
      </p>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.message}
        </p>
      ) : result.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          Nothing is scheduled yet.{" "}
          <Link href={"/dashboard/connections" as Route} className="text-ink underline underline-offset-2">
            Connect an account
          </Link>{" "}
          to start.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <ScheduleCalendar posts={result.data.data} />
          <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
            {result.data.data.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
