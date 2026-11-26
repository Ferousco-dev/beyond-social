"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { INDUSTRIES, INDUSTRY_MAX, OTHER_INDUSTRY } from "@/features/auth/schemas";
import { clearDraft } from "@/features/generate-form/draft";
import { REFERENCE_KEY } from "@/features/generate-form/reference-script";
import { searchSocial } from "@/features/discover/search-actions";
import type { DiscoverPost } from "@/features/discover/types";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

import { CountryPicker } from "./country-picker";
import { ReferencePreview } from "./reference-preview";
import { ResultGroup } from "./result-group";
import { splitPosts } from "../lib";

/** The most a search returns on Pro; the server caps every search at this. */
const PRO_RESULTS = 60;

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
] as const;

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink focus:outline-none focus:border-ink/30 focus:ring-4 focus:ring-ink/5";

/**
 * Find a video to copy the idea of: industry, country, platform and a search
 * box, then results grouped by kind. The chosen video goes straight to the
 * form, which writes the script from it in the background.
 */
export function TrendingPanel({ signupIndustry, plan }: { signupIndustry: string; plan: "free" | "pro" }) {
  const router = useRouter();
  // Start from the industry chosen at sign-up; one outside the list reopens as Other.
  const listed = INDUSTRIES.some((item) => item === signupIndustry);
  const [industryChoice, setIndustryChoice] = useState<string>(
    signupIndustry === "" ? (INDUSTRIES[0] ?? "") : listed ? signupIndustry : OTHER_INDUSTRY,
  );
  const [customIndustry, setCustomIndustry] = useState(listed ? "" : signupIndustry);
  const [countryChoice, setCountryChoice] = useState("Worldwide");
  const [customCountry, setCustomCountry] = useState("");
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
          <Select value={industryChoice} onValueChange={setIndustryChoice} options={INDUSTRIES.map((item) => ({ value: item, label: item }))} />
        </label>
        {industryChoice === OTHER_INDUSTRY ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
            Your industry
            <input
              value={customIndustry}
              onChange={(event) => setCustomIndustry(event.target.value)}
              maxLength={INDUSTRY_MAX}
              placeholder="Pet grooming"
              className={fieldClass}
            />
          </label>
        ) : null}
        <CountryPicker
          choice={countryChoice}
          onChoiceChange={setCountryChoice}
          custom={customCountry}
          onCustomChange={setCustomCountry}
        />
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
          What to focus on?
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
              className="btn btn-primary btn-md shrink-0"
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

      {posts && split ? (
        <div className="flex min-h-0 flex-col gap-6 lg:flex-row">
          <aside className="order-first w-full shrink-0 lg:order-last lg:w-[320px]">
            {selectedPost ? (
              <ReferencePreview post={selectedPost} onUse={use} />
            ) : (
              <p className="rounded-lg border border-hairline py-8 text-center text-sm text-ink-soft">No videos found. Try different words.</p>
            )}
          </aside>
          <div className="min-w-0 flex-1 space-y-6 lg:overflow-y-auto lg:pr-1">
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
