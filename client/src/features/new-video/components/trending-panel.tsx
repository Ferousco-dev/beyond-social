"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { clearDraft } from "@/features/generate-form/draft";
import { REFERENCE_KEY } from "@/features/generate-form/reference-script";
import { searchSocial } from "@/features/discover/search-actions";
import { PostTile } from "@/features/discover/components/post-tile";
import type { DiscoverPost } from "@/features/discover/types";
import { cn } from "@/lib/utils";

import { ReferencePreview } from "./reference-preview";

/** The most a search returns on Pro; the server caps every search at this. */
const PRO_RESULTS = 60;

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
] as const;

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

/**
 * Find a video to copy the idea of. One search box, one list, one button: the
 * chosen video goes straight to the form, which writes the script from it in
 * the background.
 */
export function TrendingPanel({ plan }: { plan: "free" | "pro" }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("tiktok");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<readonly DiscoverPost[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<DiscoverPost | null>(null);

  async function search() {
    if (query.trim() === "" || busy) return;
    setBusy(true);
    setError(null);
    setPosts(null);
    setSelectedPost(null);
    try {
      const result = await searchSocial({ query: query.trim(), platform });
      if (result.status !== "ok") {
        setError(result.status === "unconfigured" ? "Search is not available right now." : result.message);
        return;
      }
      setPosts(result.posts);
      setSelectedPost(result.posts[0] ?? null);
    } catch {
      setError("The search failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function use(url: string): void {
    try {
      clearDraft();
      for (const key of ["bs:generate-draft", "bs:approved-script", "bs:own-idea", "bs:quick-start"]) window.sessionStorage.removeItem(key);
      window.sessionStorage.setItem(REFERENCE_KEY, JSON.stringify({ url, key: crypto.randomUUID() }));
    } catch {
      setError("This browser could not save your choice. Check its storage settings and try again.");
      return;
    }
    router.push("/dashboard/videos/new" as Route);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex rounded-[10px] border border-hairline p-1" role="group" aria-label="Platform">
          {PLATFORMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlatform(item.id)}
              aria-pressed={platform === item.id}
              className={cn(
                "h-9 flex-1 cursor-pointer rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                platform === item.id ? "bg-cloud font-medium text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What kind of video? For example: skincare routine"
            aria-label="What kind of video?"
            className={cn(fieldClass, "min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={busy || query.trim() === ""}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-[10px] bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </span>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {posts ? (
        <div className="flex min-h-0 flex-col gap-6 lg:flex-row">
          <aside className="order-first w-full shrink-0 lg:order-last lg:w-[320px]">
            {selectedPost ? (
              <ReferencePreview post={selectedPost} onUse={use} />
            ) : (
              <p className="rounded-lg border border-hairline py-8 text-center text-sm text-ink-soft">No videos found. Try different words.</p>
            )}
          </aside>
          <div className="min-w-0 flex-1 lg:overflow-y-auto lg:pr-1">
            <p className="text-xs text-ink-soft">
              {posts.length} {posts.length === 1 ? "video" : "videos"} found. Tap one to watch it.
              {plan === "free" ? (
                <>
                  {" "}
                  <Link href="/dashboard/settings/billing" className="font-medium text-primary underline-offset-2 hover:underline">
                    Pro
                  </Link>{" "}
                  shows up to {PRO_RESULTS} per search.
                </>
              ) : null}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <PostTile key={post.videoId} post={post} selected={selectedPost?.videoId === post.videoId} onSelect={() => setSelectedPost(post)} />
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
