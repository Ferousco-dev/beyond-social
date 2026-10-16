"use client";

import { useState } from "react";

import { INDUSTRIES } from "@/features/auth/schemas";
import { searchSocial } from "@/features/discover/search-actions";
import type { DiscoverPost } from "@/features/discover/types";
import { cn } from "@/lib/utils";

import { AnalysisView } from "./analysis-view";
import { ReferencePreview } from "./reference-preview";
import { ResultGroup } from "./result-group";
import { splitPosts } from "../lib";

const COUNTRIES = [
  "Worldwide",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "India",
  "Singapore",
  "Malaysia",
  "Philippines",
] as const;

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
] as const;

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-primary";

/** Option 1: trending search with industry and country, then pick a reference. */
export function TrendingPanel() {
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0] ?? "");
  const [country, setCountry] = useState<string>(COUNTRIES[0] ?? "Worldwide");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("tiktok");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<readonly DiscoverPost[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<DiscoverPost | null>(null);
  const [analysisUrl, setAnalysisUrl] = useState<string | null>(null);

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
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (analysisUrl) {
    return <AnalysisView url={analysisUrl} context={`${industry} · ${country}`} onBack={() => setAnalysisUrl(null)} />;
  }

  const split = posts ? splitPosts(posts) : null;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Industry
          <select value={industry} onChange={(event) => setIndustry(event.target.value)} className={cn(fieldClass, "cursor-pointer")}>
            {INDUSTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Target country
          <select value={country} onChange={(event) => setCountry(event.target.value)} className={cn(fieldClass, "cursor-pointer")}>
            {COUNTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
          Platform
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
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
          What is trending in {industry}?
          <span className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="skincare routine"
              aria-label="Search trending videos"
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
        </label>
      </form>
      <p className="text-xs text-ink-soft">
        Results are worldwide for now; country targeting arrives with the scraper upgrade.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {split ? (
        <div className="mt-5 flex min-h-0 flex-col gap-6 lg:flex-row">
          <aside className="order-first w-full shrink-0 lg:order-last lg:w-[320px]">
            {selectedPost ? (
              <ReferencePreview post={selectedPost} onAnalyze={setAnalysisUrl} />
            ) : (
              <p className="rounded-lg border border-hairline py-8 text-center text-sm text-ink-soft">No videos found. Try different words.</p>
            )}
          </aside>
          <div className="min-w-0 flex-1 space-y-6 lg:overflow-y-auto lg:pr-1">
            <ResultGroup title="Human-led videos" posts={split.humanLed} selectedId={selectedPost?.videoId ?? null} onSelect={setSelectedPost} />
            <ResultGroup
              title="Product-focused videos"
              note="Grouped by caption keywords"
              posts={split.productFocused}
              selectedId={selectedPost?.videoId ?? null}
              onSelect={setSelectedPost}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
