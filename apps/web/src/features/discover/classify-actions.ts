"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { classifyShowsPerson } from "@/lib/social-scrape/classify";
import {
  readClassifications,
  writeClassification,
  type PostKey,
} from "@/lib/social-scrape/classification-cache";
import { SCRAPE_PLATFORMS } from "@/lib/social-scrape/types";

/**
 * Filling in "does this show a person" for whatever is on screen.
 *
 * Deliberately not part of the search itself: `searchSocial` stays as fast as
 * it already was, which matters because slow scraping is the client's own
 * standing complaint about this page. The filter becomes usable a moment
 * after the grid renders instead of before it, which is a better trade than
 * making every search wait on up to sixty vision calls.
 *
 * Posts already classified, by any user, under any search term, cost
 * nothing here: the cache is keyed by (platform, video id) rather than by
 * search, so this only ever pays Gemini for a post nobody has seen yet.
 */

const postSchema = z.object({
  platform: z.enum(SCRAPE_PLATFORMS),
  videoId: z.string().trim().min(1).max(64),
  thumbnailUrl: z.string().url().nullable(),
});

const schema = z.object({ posts: z.array(postSchema).max(60) });

export type ClassifyResult =
  | { status: "ok"; classifications: Record<string, boolean | null> }
  | { status: "error"; message: string };

/** How many uncached thumbnails are classified in parallel per call. A vision
 * call is a couple of seconds; unbounded concurrency would just as
 * effectively hand Gemini sixty requests in the same instant. */
const CONCURRENCY = 6;

export async function classifyPosts(input: z.input<typeof schema>): Promise<ClassifyResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to filter results." };

  const keys: PostKey[] = parsed.data.posts.map((post) => ({
    platform: post.platform,
    videoId: post.videoId,
  }));
  const known = await readClassifications(keys);

  const classifications: Record<string, boolean | null> = {};
  const unclassified = parsed.data.posts.filter((post) => {
    const key = `${post.platform}:${post.videoId}`;
    if (!known.has(key)) return true;
    classifications[key] = known.get(key) ?? null;
    return false;
  });

  // Worked through in bounded batches rather than one Promise.all: a post
  // with no thumbnail is skipped, but the concurrency cap still applies to
  // the ones that do have one.
  for (let start = 0; start < unclassified.length; start += CONCURRENCY) {
    const batch = unclassified.slice(start, start + CONCURRENCY);
    await Promise.all(
      batch.map(async (post) => {
        const key = `${post.platform}:${post.videoId}`;
        if (!post.thumbnailUrl) {
          classifications[key] = null;
          return;
        }
        const showsPerson = await classifyShowsPerson(post.thumbnailUrl);
        classifications[key] = showsPerson;
        await writeClassification({ platform: post.platform, videoId: post.videoId }, showsPerson);
      }),
    );
  }

  return { status: "ok", classifications };
}
