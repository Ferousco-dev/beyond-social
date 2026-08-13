"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useCallback, useRef, useState, useTransition } from "react";

import { type ScrapePlatform } from "@/lib/social-scrape/types";
import { type PostAnalysis } from "@/lib/tiktok/analyse";

import { analysePostAction } from "../analyse-actions";
import { PLATFORM_NAME } from "../lib/platforms";
import { searchSocial } from "../search-actions";
import { type DiscoverPost } from "../types";
import { AnalysisSheet } from "./analysis-sheet";
import { PostDetail } from "./post-detail";
import { PostTile } from "./post-tile";
import { ResultsGrid } from "./results-grid";
import { SearchBar } from "./search-bar";

/**
 * Search a platform, then study what comes back.
 *
 * This replaced a full-height snap feed that showed one post at a time. On a
 * desktop that spent the whole viewport on a single phone-shaped video with
 * dead space either side, and it answered only half the question: a creator
 * arrives wanting to know what is working, which is a question about forty
 * posts, and then wants to study one, which is a question about one. A grid
 * beside a player does both, and the grid is also what makes the page look like
 * software rather than a card floating on a background.
 *
 * It fixes a bug by construction. The feed mounted a player for whichever card
 * was in view, so scrolling past a video and back rebuilt its iframe and
 * started it from the beginning. Scrolling the grid now changes nothing.
 */

/** Shown before the first search, and again whenever one comes back empty. */
const SUGGESTIONS = ["morning routine", "small business", "before and after", "product review"];

interface Results {
  readonly posts: readonly DiscoverPost[];
  readonly term: string;
  readonly platform: ScrapePlatform;
}

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
  const [results, setResults] = useState<Results | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState<DiscoverPost | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [analysing, startAnalysis] = useTransition();

  /*
   * Searches already answered, kept for the session.
   *
   * A scrape is seconds of waiting and a charge against the Apify account, and
   * flicking between TikTok and Instagram on the same term, or going back to a
   * search after trying another, paid both again for an answer we were holding.
   * A ref rather than state: reading it must not itself cause a render.
   */
  const cache = useRef(new Map<string, readonly DiscoverPost[]>());

  const run = useCallback((term: string, on: ScrapePlatform) => {
    const text = term.trim();
    if (text.length < 2) return;

    setQuery(text);
    setNotice(null);

    const key = `${on}:${text.toLowerCase()}`;
    const held = cache.current.get(key);
    if (held) {
      setResults({ posts: held, term: text, platform: on });
      setSelectedId(held[0]?.videoId ?? null);
      if (held.length === 0) setNotice(`Nothing came back for "${text}" on ${PLATFORM_NAME[on]}.`);
      return;
    }

    startTransition(async () => {
      const result = await searchSocial({ query: text, platform: on });

      if (result.status !== "ok") {
        setResults(null);
        setSelectedId(null);
        setNotice(
          result.status === "unconfigured" ? "Search is not connected yet." : result.message,
        );
        return;
      }

      cache.current.set(key, result.posts);
      setResults({ posts: result.posts, term: text, platform: on });
      // The first result opens on its own. Landing on a grid where nothing is
      // playing makes the pane look broken until you happen to click.
      setSelectedId(result.posts[0]?.videoId ?? null);
      if (result.posts.length === 0) {
        setNotice(`Nothing came back for "${text}" on ${PLATFORM_NAME[on]}.`);
      }
    });
  }, []);

  /** Seeds a new chat with a brief. The composer waits; nothing is sent. */
  const seed = useCallback(
    (brief: string) => {
      router.push(`/dashboard/c/new?prompt=${encodeURIComponent(brief)}` as Route);
    },
    [router],
  );

  /**
   * Reads the post, then offers what it found.
   *
   * A failure falls back to naming the post rather than dead-ending: a weaker
   * brief still beats a button that does nothing.
   */
  const openAsInspiration = useCallback(
    (post: DiscoverPost) => {
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
            `Make a video in the style of this ${PLATFORM_NAME[post.platform]} post by @${post.handle}.`,
            post.caption ? `The original caption was: ${post.caption}` : "",
            `Reference: ${post.url}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      });
    },
    [seed],
  );

  const posts = results?.posts ?? [];
  const selected = posts.find((post) => post.videoId === selectedId) ?? posts[0] ?? null;

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <div className="shrink-0">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          platform={platform}
          onPlatformChange={(next) => {
            setPlatform(next);
            if (query.trim().length >= 2) run(query, next);
          }}
          onSubmit={() => run(query, platform)}
          busy={pending}
        />
      </div>

      <ResultsGrid
        busy={pending}
        notice={notice}
        query={query}
        term={results?.term ?? ""}
        platform={results?.platform ?? platform}
        count={posts.length}
        suggestions={[...industryTerms, ...SUGGESTIONS]}
        onSuggestion={(term) => run(term, platform)}
        detail={
          selected ? (
            <PostDetail
              post={selected}
              analysing={analysing}
              onUse={() => openAsInspiration(selected)}
            />
          ) : null
        }
      >
        {posts.map((post) => (
          <PostTile
            key={post.videoId}
            post={post}
            selected={post.videoId === selected?.videoId}
            onSelect={() => setSelectedId(post.videoId)}
          />
        ))}
      </ResultsGrid>

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
    </div>
  );
}
