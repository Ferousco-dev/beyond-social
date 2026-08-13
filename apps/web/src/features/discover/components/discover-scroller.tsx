"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useState, useTransition, type FormEvent } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { SCRAPE_PLATFORMS, type ScrapePlatform } from "@/lib/social-scrape/types";
import { cn } from "@/lib/utils";

import { analysePostAction } from "../analyse-actions";
import { searchSocial } from "../search-actions";
import { type DiscoverPost } from "../types";
import { type PostAnalysis } from "@/lib/tiktok/analyse";
import { useActivePost } from "../hooks/use-active-post";
import { AnalysisSheet } from "./analysis-sheet";
import { PostCard } from "./post-card";

/**
 * Search a platform, then scroll the results like a feed.
 *
 * The scroll is snapped so a flick lands on a post rather than between two, and
 * the container scrolls rather than the page: a feed that moves the whole
 * document takes the search bar away with it, and the next search is usually one
 * post in.
 */

/**
 * Shown before the first search, and again whenever one comes back empty.
 *
 * They used to render only while `posts` was null, so the first search removed
 * them for good: a search that found nothing left a notice, an empty screen and
 * no cheap way to try something else.
 */
const SUGGESTIONS = ["morning routine", "small business", "before and after", "product review"];

/** Both scrapers have existed since the pivot; only one had a way in. */
const PLATFORM_NAME: Record<ScrapePlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

export function DiscoverScroller({
  initialQuery = "",
  /** The user's industry, prepended so the first suggestions are about them. */
  industryTerms = [],
}: {
  initialQuery?: string;
  industryTerms?: readonly string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState<ScrapePlatform>("tiktok");
  /**
   * What the shown results were actually a search for.
   *
   * Held apart from `query`, which changes as the user types. Without it the
   * count under the feed relabelled itself mid-edit and claimed the results
   * belonged to a search that had not been run.
   */
  const [searched, setSearched] = useState<{ term: string; platform: ScrapePlatform } | null>(null);
  const [posts, setPosts] = useState<readonly DiscoverPost[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /** The post being read, and what came back. Null while nothing is open. */
  const [reading, setReading] = useState<DiscoverPost | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [analysing, startAnalysis] = useTransition();
  const { containerRef, activeIndex, setActiveIndex } = useActivePost(posts?.length ?? 0);

  function run(term: string, on: ScrapePlatform = platform) {
    const text = term.trim();
    if (text.length < 2) return;

    setQuery(text);
    setNotice(null);

    startTransition(async () => {
      const result = await searchSocial({ query: text, platform: on });

      if (result.status === "unconfigured") {
        setPosts([]);
        setSearched(null);
        setNotice("Search is not connected yet.");
        return;
      }
      if (result.status === "error") {
        setPosts([]);
        setSearched(null);
        setNotice(result.message);
        return;
      }

      setPosts(result.posts);
      setSearched({ term: text, platform: on });
      setActiveIndex(0);
      if (result.posts.length === 0) {
        setNotice(`Nothing came back for "${text}" on ${PLATFORM_NAME[on]}.`);
      }
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run(query);
  }

  /** Seeds a new chat with a brief. The composer waits; nothing is sent. */
  function seed(brief: string) {
    router.push(`/dashboard/c/new?prompt=${encodeURIComponent(brief)}` as Route);
  }

  /**
   * Reads the post, then offers what it found.
   *
   * This used to hand the generator one sentence naming the account and pasting
   * the caption, plus a link no model can open, so "in the style of this TikTok"
   * was a phrase rather than an instruction. Now the signals TikTok does report
   * are turned into a format first, and shown before anything is made from them.
   *
   * A failure falls back to the old sentence rather than dead-ending: a weaker
   * brief still beats a button that does nothing.
   */
  function openAsInspiration(post: DiscoverPost) {
    setNotice(null);
    setAnalysis(null);
    setReading(post);

    startAnalysis(async () => {
      const result = await analysePostAction({
        handle: post.handle,
        caption: post.caption,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
        durationSeconds: post.durationSeconds,
        hashtags: [...post.hashtags],
        transcript: post.transcript,
      });

      if (result.status === "ok") {
        setAnalysis(result.analysis);
        return;
      }

      setReading(null);
      seed(
        [
          `Make a video in the style of this TikTok by @${post.handle}.`,
          post.caption ? `The original caption was: ${post.caption}` : "",
          `Reference: ${post.url}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    });
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      {/* Which platform is being searched, chosen before the search rather than
          discovered from the results. Re-runs the current term on switch, so
          the toggle answers "what does this look like over there" in one tap. */}
      <div role="group" aria-label="Platform to search" className="mb-3 flex shrink-0 gap-2">
        {SCRAPE_PLATFORMS.map((option) => {
          const current = option === platform;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={current}
              onClick={() => {
                setPlatform(option);
                if (query.trim().length >= 2) run(query, option);
              }}
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                current
                  ? "border-transparent bg-ink text-paper"
                  : "border-hairline bg-paper text-ink-soft hover:text-ink",
              )}
            >
              <PlatformLogo platform={option} className="size-4" colour={!current} />
              {PLATFORM_NAME[option]}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0">
        <label htmlFor="social-search" className="sr-only">
          Search {PLATFORM_NAME[platform]}
        </label>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            id="social-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${PLATFORM_NAME[platform]} for anything...`}
            className="h-12 w-full rounded-full border border-hairline bg-paper pl-11 pr-28 text-base text-ink placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending || query.trim().length < 2}
            className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Search
          </button>
        </div>
      </form>

      {/* Offered before the first search and after one that found nothing, but
          never over a feed the user is reading. */}
      {posts === null || posts.length === 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {[...industryTerms, ...SUGGESTIONS].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => run(suggestion)}
              className="cursor-pointer rounded-full border border-hairline bg-paper px-4 py-2 text-sm text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {/*
        The search takes seconds against a scraper, and the only sign it had
        started was a spinner inside the button, with the previous results still
        on screen underneath. So a slow search looked like a search that had
        found the same thing again. This says what is happening, and afterwards
        says what came back rather than leaving the user to count the feed.
      */}
      {pending ? (
        <p role="status" className="mt-6 text-sm text-ink-soft">
          Searching {PLATFORM_NAME[platform]} for &ldquo;{query.trim()}&rdquo;...
        </p>
      ) : notice ? (
        <p role="status" className="mt-6 text-sm text-ink-soft">
          {notice}
        </p>
      ) : searched !== null && posts !== null && posts.length > 0 ? (
        <p role="status" className="mt-4 shrink-0 text-sm text-ink-soft">
          {posts.length} {posts.length === 1 ? "post" : "posts"} for &ldquo;{searched.term}&rdquo;
          on {PLATFORM_NAME[searched.platform]}
        </p>
      ) : null}

      {posts !== null && posts.length > 0 ? (
        <div
          ref={containerRef}
          // `overscroll-contain` stops a flick at either end scrolling the page
          // behind the feed, which on a touchpad reads as the app jumping.
          className="mt-4 min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
        >
          {posts.map((post, index) => (
            <div key={post.videoId} data-post-index={index} className="h-full">
              <PostCard
                post={post}
                active={index === activeIndex}
                onActivate={() => setActiveIndex(index)}
                onUse={() => openAsInspiration(post)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <AnalysisSheet
        analysis={analysis}
        handle={reading?.handle ?? ""}
        open={reading !== null && analysis !== null}
        onOpenChange={(next) => {
          if (!next) {
            setReading(null);
            setAnalysis(null);
          }
        }}
        onUse={seed}
      />

      {/* The read takes a moment and happens after a tap on a card, so it needs
          to say something or the tap looks ignored. */}
      {analysing ? (
        <p role="status" className="mt-4 text-center text-sm text-ink-soft">
          Reading that post...
        </p>
      ) : null}
    </div>
  );
}
