"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { type PostAnalysis } from "@/lib/tiktok/analyse";

import {
  analysePostAction,
  analysePostDeepAction,
  analysisCostsAction,
  type AnalysisCosts,
} from "../analyse-actions";
import { PLATFORM_NAME } from "../lib/platforms";
import { type DiscoverPost } from "../types";

/**
 * Reading one post, in either tier, and offering what came back.
 *
 * Pulled out of the scroller because "read this post" is a self-contained
 * unit of state (which post, which tier, whether either run is in flight,
 * what each one costs) that the search and grid state around it does not
 * need to know about.
 *
 * A denial (not signed in, out of credits) stops the run and says why: this
 * is a paid feature now, and silently falling back to a generic brief would
 * spend the user's attention on a result they never actually paid for or
 * agreed to. Any other failure still falls back to naming the post rather
 * than dead-ending: a weaker brief still beats a button that does nothing.
 */
export function usePostAnalysis(options: {
  setNotice: (message: string | null) => void;
  /** Seeds a new chat with a brief; used for the fallback and for "use this". */
  seed: (brief: string) => void;
}) {
  const { setNotice, seed } = options;

  const [reading, setReading] = useState<DiscoverPost | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [analysisTier, setAnalysisTier] = useState<"inspiration" | "deep">("inspiration");
  const [analysing, startAnalysis] = useTransition();
  const [analysingDeep, startDeepAnalysis] = useTransition();
  /** Priced once on mount; both tiers cost credits and the buttons say so upfront. */
  const [costs, setCosts] = useState<AnalysisCosts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void analysisCostsAction().then((result) => {
      if (!cancelled) setCosts(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function fallbackBrief(post: DiscoverPost): string {
    return [
      `Make a video in the style of this ${PLATFORM_NAME[post.platform]} post by @${post.handle}.`,
      post.caption ? `The original caption was: ${post.caption}` : "",
      `Reference: ${post.url}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const openAsInspiration = useCallback(
    (post: DiscoverPost) => {
      setNotice(null);
      setAnalysis(null);
      setAnalysisTier("inspiration");
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
        if (result.status === "denied") {
          setNotice(result.message);
          return;
        }
        if (result.status === "error") setNotice(result.message);
        seed(fallbackBrief(post));
      });
    },
    [setNotice, seed],
  );

  /** The same read, but watching the clip itself rather than the numbers about it. */
  const openAsInspirationDeep = useCallback(
    (post: DiscoverPost) => {
      setNotice(null);
      setAnalysis(null);
      setAnalysisTier("deep");
      setReading(post);

      startDeepAnalysis(async () => {
        const result = await analysePostDeepAction({
          platform: post.platform,
          url: post.url,
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
        if (result.status === "denied") {
          setNotice(result.message);
          return;
        }
        if (result.status === "error") setNotice(result.message);
        seed(fallbackBrief(post));
      });
    },
    [setNotice, seed],
  );

  const close = useCallback(() => {
    setReading(null);
    setAnalysis(null);
  }, []);

  return {
    reading,
    analysis,
    analysisTier,
    analysing,
    analysingDeep,
    costs,
    openAsInspiration,
    openAsInspirationDeep,
    close,
  };
}
