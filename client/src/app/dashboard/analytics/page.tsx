import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { getPostMetrics, getRecentMetrics, type MetricsPoint, type MetricsResult } from "@/features/analytics/actions";
import { BarList, Sparkline, ViewsChart, type DayPoint } from "@/features/analytics/components/views-chart";
import { ConnectEmptyState } from "@/features/connections/connect-empty-state";
import { goApi } from "@/lib/go-api/client";
import { postsResponse, socialListResponse, type ScheduledPost } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const PLATFORM: Readonly<Record<ScheduledPost["platform"], string>> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

/** Per-video engagement with real trends. YouTube only for now. */
export default async function AnalyticsPage(): Promise<ReactNode> {
  // With no account connected there is nothing to measure, so nothing else is requested.
  const accounts = await goApi("/api/v1/social", socialListResponse);
  if (accounts.ok && !accounts.data.data.some((account) => account.connected)) return <ConnectEmptyState />;

  const result = await goApi("/api/v1/posts?limit=100", postsResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="mx-auto max-w-2xl px-4 py-10 text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const published = result.data.data.filter((post) => post.status === "published").slice(0, 20);
  // One request for every video; an API without the batch route falls back to one per video.
  const batch = await getRecentMetrics(20);
  const rows: { post: ScheduledPost; metrics: MetricsResult }[] = await Promise.all(
    published.map(async (post) => ({
      post,
      metrics: batch ? (batch.get(post.id) ?? { status: "ok" as const, latest: null, history: [] }) : await getPostMetrics(post.id),
    })),
  );

  // Snapshots are cumulative totals, so daily movement is the diff between
  // consecutive snapshots, summed across videos by calendar day.
  const deltas = new Map<string, { views: number; likes: number }>();
  for (const row of rows) {
    if (row.metrics.status !== "ok") continue;
    const ordered = [...row.metrics.history].reverse();
    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1];
      const current = ordered[i];
      if (!previous || !current) continue;
      const key = current.collectedAt.slice(0, 10);
      const day = deltas.get(key) ?? { views: 0, likes: 0 };
      day.views += Math.max(0, current.views - previous.views);
      day.likes += Math.max(0, current.likes - previous.likes);
      deltas.set(key, day);
    }
  }
  const days: DayPoint[] = [...deltas.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([iso, values]) => ({
      label: new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      views: values.views,
      likes: values.likes,
    }));

  let totals = { views: 0, likes: 0, comments: 0 };
  const cards = rows.map(({ post, metrics }) => {
    const latest = metrics.status === "ok" ? metrics.latest : null;
    const history: readonly MetricsPoint[] = metrics.status === "ok" ? metrics.history : [];
    if (latest) {
      totals = { views: totals.views + latest.views, likes: totals.likes + latest.likes, comments: totals.comments + latest.comments };
    }
    const rate = latest && latest.views > 0 ? ((latest.likes + latest.comments) / latest.views) * 100 : null;
    return { post, latest, history, rate };
  });

  const byPlatform = new Map<ScheduledPost["platform"], number>();
  for (const { post, latest } of cards) byPlatform.set(post.platform, (byPlatform.get(post.platform) ?? 0) + (latest?.views ?? 0));
  const platforms = [...byPlatform.entries()].sort((a, b) => b[1] - a[1]).map(([platform, value]) => ({ label: PLATFORM[platform], value }));
  const top = cards
    .filter((card) => card.latest)
    .sort((a, b) => (b.latest?.views ?? 0) - (a.latest?.views ?? 0))
    .slice(0, 5)
    .map((card) => ({
      label: card.post.title || card.post.caption || "Untitled video",
      value: card.latest?.views ?? 0,
      hint: card.rate !== null ? `${card.rate.toFixed(1)}% engaged · ${PLATFORM[card.post.platform]}` : PLATFORM[card.post.platform],
    }));
  const engagement = totals.views > 0 ? ((totals.likes + totals.comments) / totals.views) * 100 : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Collected from YouTube after each post. TikTok and Instagram do not share metrics yet.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Views", totals.views.toLocaleString()],
            ["Likes", totals.likes.toLocaleString()],
            ["Comments", totals.comments.toLocaleString()],
            ["Engagement", engagement === null ? "—" : `${engagement.toFixed(1)}%`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-hairline bg-paper p-4">
            <p className="text-xs text-ink-soft">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
          </div>
        ))}
      </div>

      {days.length >= 2 ? (
        <div className="mt-4">
          <ViewsChart days={days} />
        </div>
      ) : cards.length > 0 ? (
        <p className="mt-4 rounded-2xl border border-hairline bg-paper p-5 text-sm text-ink-soft">The daily chart appears after a second metrics snapshot, usually within a day.</p>
      ) : null}

      {top.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="text-sm font-semibold text-ink">Top videos</h2>
            <div className="mt-4">
              <BarList items={top} unit="views" />
            </div>
          </section>
          <section className="rounded-2xl border border-hairline bg-paper p-5">
            <h2 className="text-sm font-semibold text-ink">By platform</h2>
            <div className="mt-4">
              <BarList items={platforms} unit="views" />
            </div>
          </section>
        </div>
      ) : null}

      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          Nothing published yet. Metrics appear here after the first post.{" "}
          <Link href="/dashboard/new" className="font-medium text-primary underline-offset-2 hover:underline">
            Make a video
          </Link>
        </p>
      ) : (
        <>
        <h2 className="mt-8 text-sm font-semibold text-ink">All published videos</h2>
        <ul className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {cards.map(({ post, latest, history, rate }) => (
            <li key={post.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {PLATFORM[post.platform]}
                  <span className="ml-2 font-normal text-ink-soft">
                    {new Date(post.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-sm text-ink-soft">{post.title || post.caption || "Untitled video"}</p>
                {latest ? (
                  <p className="mt-1.5 text-xs tabular-nums text-ink-soft">
                    {latest.views.toLocaleString()} views · {latest.likes.toLocaleString()} likes ·{" "}
                    {latest.comments.toLocaleString()} comments
                    {rate !== null ? ` · ${rate.toFixed(1)}% engaged` : null}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-soft">Collecting… check back in a few hours.</p>
                )}
              </div>
              <Sparkline points={[...history].reverse().map((point) => point.views)} />
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
