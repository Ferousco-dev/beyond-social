import { type Metadata } from "next";
import { type ReactNode } from "react";

import { getPostMetrics } from "@/features/analytics/actions";
import { goApi } from "@/lib/go-api/client";
import { postsResponse, type ScheduledPost } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const PLATFORM: Readonly<Record<ScheduledPost["platform"], string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

/** Per-video engagement from the collector. YouTube only for now. */
export default async function AnalyticsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/posts?limit=100", postsResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="mx-auto max-w-2xl px-4 py-10 text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const published = result.data.data.filter((post) => post.status === "published").slice(0, 20);
  const rows = await Promise.all(
    published.map(async (post) => ({ post, metrics: await getPostMetrics(post.id) })),
  );
  const totals = rows.reduce(
    (sum, row) => ({
      views: sum.views + (row.metrics.status === "ok" && row.metrics.latest ? row.metrics.latest.views : 0),
      likes: sum.likes + (row.metrics.status === "ok" && row.metrics.latest ? row.metrics.latest.likes : 0),
    }),
    { views: 0, likes: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Collected from YouTube after each post. TikTok and Instagram do not share metrics yet.
      </p>

      <p className="mt-4 flex items-baseline gap-4">
        <span>
          <span className="text-3xl font-semibold tabular-nums text-ink">{totals.views.toLocaleString()}</span>{" "}
          <span className="text-sm text-ink-soft">views</span>
        </span>
        <span>
          <span className="text-3xl font-semibold tabular-nums text-ink">{totals.likes.toLocaleString()}</span>{" "}
          <span className="text-sm text-ink-soft">likes</span>
        </span>
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nothing published yet. Metrics appear here after the first post.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {rows.map(({ post, metrics }) => (
            <li key={post.id} className="p-4">
              <p className="text-sm font-medium text-ink">
                {PLATFORM[post.platform]}
                <span className="ml-2 font-normal text-ink-soft">
                  {new Date(post.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </p>
              <p className="mt-0.5 truncate text-sm text-ink-soft">{post.title || post.caption || "Untitled video"}</p>
              {metrics.status === "ok" && metrics.latest ? (
                <p className="mt-1.5 text-xs tabular-nums text-ink-soft">
                  {metrics.latest.views.toLocaleString()} views · {metrics.latest.likes.toLocaleString()} likes ·{" "}
                  {metrics.latest.comments.toLocaleString()} comments
                  {metrics.points > 1 ? ` · ${metrics.points} snapshots` : null}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-ink-soft">Collecting… check back in a few hours.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
