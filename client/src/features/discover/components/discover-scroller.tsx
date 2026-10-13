"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { looksLikeUrl, parseSocialUrl } from "@/lib/social-scrape/url";
import { type ScrapePlatform } from "@/lib/social-scrape/types";

import { useSearchHistory, type PastSearch } from "../hooks/use-search-history";
import { PLATFORM_NAME } from "../lib/platforms";
import { searchSocial } from "../search-actions";
import { type DiscoverPost } from "../types";
import { scrapePostFromUrl } from "../url-actions";
import { PostDetail } from "./post-detail";
import { PostTile } from "./post-tile";
import { ResultsGrid } from "./results-grid";
import { SearchBar } from "./search-bar";
import { SearchHistory } from "./search-history";

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

/** One screen of results. The rest are behind "show more", already fetched. */
const PAGE = 24;

interface Results {
  readonly posts: readonly DiscoverPost[];
  readonly term: string;
  readonly platform: ScrapePlatform;
  readonly countryCode: string | null;
}

export function DiscoverScroller({ initialQuery = "", note }: { initialQuery?: string; note: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState<ScrapePlatform>("tiktok");
  const [results, setResults] = useState<Results | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeCode, setNoticeCode] = useState<string | undefined>(undefined);
  const [shown, setShown] = useState(PAGE);
  const { history, remember, clear } = useSearchHistory();
  const [pending, startTransition] = useTransition();
  /*
   * Searches already answered, kept for the session.
   *
   * A scrape is seconds of waiting and a charge against the Apify account, and
   * flicking between TikTok and Instagram on the same term, or going back to a
   * search after trying another, paid both again for an answer we were holding.
   * A ref rather than state: reading it must not itself cause a render.
   */
  const cache = useRef(
    new Map<
      string,
      { readonly posts: readonly DiscoverPost[]; readonly countryCode: string | null }
    >(),
  );

  /*
   * Which search is the one the screen should show.
   *
   * Two searches in flight at once, typing a new term before the last one
   * answered, or flicking the platform toggle mid-search, used to race:
   * whichever `searchSocial` call resolved last won, so a fast answer to an
   * old term could overwrite a slow answer to the one actually on screen. The
   * query text and the results shown would then belong to two different
   * searches with nothing to say so. Each call claims a ticket and only
   * applies its result while still holding the latest one.
   */
  const latestSearch = useRef(0);

  const run = useCallback(
    (term: string, on: ScrapePlatform) => {
      const text = term.trim();
      if (text.length < 2) return;

      const ticket = ++latestSearch.current;

      setQuery(text);
      setNotice(null);
      // Back to the first page: leaving it where it was showed forty results
      // for a search that had just returned thirty.
      setShown(PAGE);
      remember(text, on);

      const key = `${on}:${text.toLowerCase()}`;
      const held = cache.current.get(key);
      if (held) {
        setResults({ posts: held.posts, term: text, platform: on, countryCode: held.countryCode });
        setSelectedId(held.posts[0]?.videoId ?? null);
        if (held.posts.length === 0)
          setNotice(`Nothing came back for "${text}" on ${PLATFORM_NAME[on]}.`);
        return;
      }

      startTransition(async () => {
        const result = await searchSocial({ query: text, platform: on });
        // A search is charged, so the sidebar balance has moved.
        router.refresh();

        // A newer search started while this one was in flight, so this
        // answer is for a term or platform no longer on screen.
        if (ticket !== latestSearch.current) return;

        if (result.status !== "ok") {
          setResults(null);
          setSelectedId(null);
          setNotice(
            result.status === "unconfigured" ? "Search is not connected yet." : result.message,
          );
          setNoticeCode(result.status === "error" ? result.code : undefined);
          return;
        }

        cache.current.set(key, { posts: result.posts, countryCode: result.countryCode });
        setResults({
          posts: result.posts,
          term: text,
          platform: on,
          countryCode: result.countryCode,
        });
        // The first result opens on its own. Landing on a grid where nothing is
        // playing makes the pane look broken until you happen to click.
        setSelectedId(result.posts[0]?.videoId ?? null);
        if (result.posts.length === 0) {
          setNotice(`Nothing came back for "${text}" on ${PLATFORM_NAME[on]}.`);
        }
      });
    },
    [remember, router],
  );

  /**
   * Scrapes the one post a pasted link points to, rather than searching.
   *
   * A different shape of result from a search (one post, no ranking, no
   * "show more"), so it goes through its own transition rather than being
   * squeezed into `run`, which assumes a results page.
   */
  const runUrl = useCallback((url: string) => {
    const ticket = ++latestSearch.current;
    setQuery(url);
    setNotice(null);
    setShown(PAGE);

    startTransition(async () => {
      const result = await scrapePostFromUrl({ url });
      if (ticket !== latestSearch.current) return;

      if (result.status !== "ok") {
        setResults(null);
        setSelectedId(null);
        setNotice(
          result.status === "unconfigured"
            ? "Search is not connected yet."
            : result.status === "unrecognised"
              ? "That link is not a TikTok or Instagram post. Paste the post's own page, not a shortened link."
              : result.status === "not_found"
                ? "Could not find that post. It may be private or removed."
                : result.message,
        );
        return;
      }

      setPlatform(result.post.platform);
      setResults({
        posts: [result.post],
        term: `@${result.post.handle}`,
        platform: result.post.platform,
        countryCode: null,
      });
      setSelectedId(result.post.videoId);
    });
  }, []);

  /**
   * What pressing Search does: a pasted link is scraped directly, anything else
   * is a search term.
   */
  const submit = useCallback(
    (term: string, on: ScrapePlatform) => {
      const text = term.trim();
      if (text.length < 2) return;
      if (looksLikeUrl(text)) {
        const social = parseSocialUrl(text);
        if (social) {
          runUrl(social.url);
          return;
        }
        setResults(null);
        setSelectedId(null);
        setNotice(
          "That link is not a TikTok or Instagram post. Paste the post's own page, not a shortened link.",
        );
        return;
      }
      run(text, on);
    },
    [run, runUrl],
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
            if (query.trim().length >= 2) {
              submit(query, next);
            } else {
              // Too short to search, so nothing was submitted, but the grid
              // was still showing the last platform's results under a toggle
              // that had already moved on.
              setResults(null);
              setNotice(null);
            }
          }}
          onSubmit={() => submit(query, platform)}
          busy={pending}
          note={note}
        />
      </div>

      <ResultsGrid
        busy={pending}
        notice={notice}
        noticeCode={noticeCode}
        query={query}
        term={results?.term ?? ""}
        platform={results?.platform ?? platform}
        countryCode={results?.countryCode ?? null}
        count={posts.length}
        suggestions={SUGGESTIONS}
        onSuggestion={(term) => run(term, platform)}
        shown={shown}
        onShowMore={() => setShown((current) => current + PAGE)}
        history={
          <SearchHistory
            history={history}
            onPick={(past: PastSearch) => {
              setPlatform(past.platform);
              run(past.term, past.platform);
            }}
            onClear={clear}
          />
        }
        detail={
          selected ? (
            <PostDetail post={selected} />
          ) : null
        }
      >
        {posts.slice(0, shown).map((post) => (
          <PostTile
            key={post.videoId}
            post={post}
            selected={post.videoId === selected?.videoId}
            onSelect={() => setSelectedId(post.videoId)}
          />
        ))}
      </ResultsGrid>
    </div>
  );
}
