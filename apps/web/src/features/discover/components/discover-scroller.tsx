"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useCallback, useRef, useState, useTransition } from "react";

import { ScriptSheet, type ScriptTake } from "@/features/script/components/script-sheet";
import { leaveSeed } from "@/lib/composer/seed";
import { type ScrapePlatform } from "@/lib/social-scrape/types";
import { type PostAnalysis } from "@/lib/tiktok/analyse";

import { analysePostAction } from "../analyse-actions";
import { useSearchHistory, type PastSearch } from "../hooks/use-search-history";
import { PLATFORM_NAME } from "../lib/platforms";
import { suggestQueries } from "../query-actions";
import { searchSocial } from "../search-actions";
import { type DiscoverPost } from "../types";
import { AnalysisSheet } from "./analysis-sheet";
import { PostDetail } from "./post-detail";
import { PostTile } from "./post-tile";
import { ResultsGrid } from "./results-grid";
import { SearchBar } from "./search-bar";
import { SearchHistory, SuggestedQueries } from "./search-history";

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

/**
 * Whether a query is a description rather than a search term.
 *
 * Neither platform can search a sentence: TikTok returns nothing and Instagram
 * turns it into a hashtag, which drops every word after the first. Rather than
 * spend a scrape finding that out, a query that reads like a brief is turned
 * into real terms first.
 *
 * Length alone is not the test, and using it was wrong. Real search terms run
 * long: "get ready with me makeup" and "day in the life of a nurse" are five
 * and seven words and both are exactly what somebody would type. What actually
 * separates the two is who the query is about. A brief is written in the first
 * person, about their shop and their product, where a search term is written
 * about the world.
 */
const FIRST_PERSON = /\b(i|my|our|we|us|mine)\b/i;

function readsLikeABrief(query: string): boolean {
  const words = query.trim().split(/\s+/).length;
  // Long enough is a brief whoever it is about; in between, the pronoun decides.
  return words > 8 || (words > 4 && FIRST_PERSON.test(query));
}

interface Results {
  readonly posts: readonly DiscoverPost[];
  readonly term: string;
  readonly platform: ScrapePlatform;
  readonly countryCode: string | null;
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
  const [shown, setShown] = useState(PAGE);
  const [suggested, setSuggested] = useState<readonly string[] | null>(null);
  const { history, remember, clear } = useSearchHistory();
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState<DiscoverPost | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [analysing, startAnalysis] = useTransition();
  /** Open once the user asks for a script rather than the paragraph. */
  const [scripting, setScripting] = useState(false);

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
      setSuggested(null);
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

        // A newer search started while this one was in flight, so this
        // answer is for a term or platform no longer on screen.
        if (ticket !== latestSearch.current) return;

        if (result.status !== "ok") {
          setResults(null);
          setSelectedId(null);
          setNotice(
            result.status === "unconfigured" ? "Search is not connected yet." : result.message,
          );
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
    [remember],
  );

  /**
   * What pressing Search does.
   *
   * A short query is a search term and goes straight through. A long one is a
   * description, which neither platform can search, so it is read into terms
   * and offered before anything is scraped: finding that out by spending a run
   * and showing nothing would cost money to teach the user their query was
   * wrong.
   */
  const submit = useCallback(
    (term: string, on: ScrapePlatform) => {
      const text = term.trim();
      if (text.length < 2) return;
      if (!readsLikeABrief(text)) {
        run(text, on);
        return;
      }

      setNotice(null);
      startTransition(async () => {
        const result = await suggestQueries({ prompt: text });
        // `skip` covers no model, a signed-out caller and a failed read. In
        // every one of them searching what they typed beats doing nothing.
        if (result.status !== "ok") {
          run(text, on);
          return;
        }
        setSuggested(result.queries);
      });
    },
    [run],
  );

  /** Seeds a new chat with a brief. The composer waits; nothing is sent. */
  const seed = useCallback(
    (brief: string) => {
      router.push(`/dashboard/c/new?prompt=${encodeURIComponent(brief)}` as Route);
    },
    [router],
  );

  /**
   * Seeds a new chat with a compiled script and its beats.
   *
   * Left in session storage rather than on the URL: a script is a couple of
   * thousand characters of newlines and quoted dialogue, and the shot list is
   * structure that a query string would have to be taught to carry.
   */
  const seedScript = useCallback(
    (take: ScriptTake) => {
      leaveSeed({ prompt: take.compiled.prompt, shots: take.compiled.shots, photos: take.photos });
      setScripting(false);
      setReading(null);
      setAnalysis(null);
      router.push("/dashboard/c/new" as Route);
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
        />
      </div>

      {/* Offered instead of results when the query was a sentence. Choosing one
          searches it; declining searches what they actually typed. */}
      {suggested && !pending ? (
        <SuggestedQueries
          queries={suggested}
          onPick={(term) => run(term, platform)}
          onSearchAnyway={() => {
            setSuggested(null);
            run(query, platform);
          }}
        />
      ) : null}

      <ResultsGrid
        busy={pending}
        notice={notice}
        query={query}
        term={results?.term ?? ""}
        platform={results?.platform ?? platform}
        countryCode={results?.countryCode ?? null}
        count={posts.length}
        suggestions={[...industryTerms, ...SUGGESTIONS]}
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
            <PostDetail
              post={selected}
              analysing={analysing}
              onUse={() => openAsInspiration(selected)}
            />
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

      <AnalysisSheet
        analysis={analysis}
        handle={reading?.handle ?? ""}
        // Stands aside while the script is being written, so the two sheets are
        // never stacked on top of each other.
        open={reading !== null && analysis !== null && !scripting}
        onOpenChange={(next) => {
          if (!next && !scripting) {
            setReading(null);
            setAnalysis(null);
          }
        }}
        onUse={seed}
        onWriteScript={() => setScripting(true)}
      />

      <ScriptSheet
        analysis={analysis}
        open={scripting}
        onOpenChange={setScripting}
        onUse={seedScript}
      />
    </div>
  );
}
