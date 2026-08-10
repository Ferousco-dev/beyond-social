"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useState, useTransition, type FormEvent } from "react";

import { searchTikTok } from "../search-actions";
import { type DiscoverPost } from "../types";
import { useActivePost } from "../hooks/use-active-post";
import { PostCard } from "./post-card";

/**
 * Search TikTok, then scroll the results like a feed.
 *
 * The scroll is snapped so a flick lands on a post rather than between two, and
 * the container scrolls rather than the page: a feed that moves the whole
 * document takes the search bar away with it, and the next search is usually one
 * post in.
 */

/** Shown before the first search, so the page is never a bare input. */
const SUGGESTIONS = ["morning routine", "small business", "before and after", "product review"];

export function DiscoverScroller({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [posts, setPosts] = useState<readonly DiscoverPost[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { containerRef, activeIndex, setActiveIndex } = useActivePost(posts?.length ?? 0);

  function run(term: string) {
    const text = term.trim();
    if (text.length < 2) return;

    setQuery(text);
    setNotice(null);

    startTransition(async () => {
      const result = await searchTikTok({ query: text });

      if (result.status === "unconfigured") {
        setPosts([]);
        setNotice("TikTok search is not connected yet.");
        return;
      }
      if (result.status === "error") {
        setPosts([]);
        setNotice(result.message);
        return;
      }

      setPosts(result.posts);
      setActiveIndex(0);
      if (result.posts.length === 0) setNotice(`Nothing came back for "${text}".`);
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run(query);
  }

  /** Carries the post into a new chat as the thing to make something like. */
  function openAsInspiration(post: DiscoverPost) {
    const brief = [
      `Make a video in the style of this TikTok by @${post.handle}.`,
      post.caption ? `The original caption was: ${post.caption}` : "",
      `Reference: ${post.url}`,
    ]
      .filter(Boolean)
      .join("\n");

    router.push(`/dashboard/c/new?prompt=${encodeURIComponent(brief)}` as Route);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <form onSubmit={handleSubmit} className="shrink-0">
        <label htmlFor="tiktok-search" className="sr-only">
          Search TikTok
        </label>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            id="tiktok-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search TikTok for anything..."
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

      {posts === null ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
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

      {notice ? (
        <p role="status" className="mt-6 text-sm text-ink-soft">
          {notice}
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
    </div>
  );
}
