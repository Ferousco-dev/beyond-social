"use client";

import { z } from "zod";
import { ArrowRight, Clapperboard, Link2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { watchClip } from "@/features/studio/assist-actions";
import { scrapePostFromUrl } from "@/features/discover/url-actions";

const FIELD =
  "mt-1.5 min-h-11 w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const LABEL = "block text-sm font-medium text-ink";
const ideaSchema = z.object({
  objective: z.string().trim().min(1).max(120),
  audience: z.string().trim().min(1).max(300),
  offering: z.string().trim().min(1).max(300),
  country: z.string().trim().min(1).max(100),
  style: z.string().trim().min(1).max(200),
});

type Option = "trending" | "link" | "idea";

const OPTIONS: ReadonlyArray<{
  id: Option;
  title: string;
  description: string;
  icon: typeof Search;
}> = [
  {
    id: "trending",
    title: "Find trending videos",
    description: "Search TikTok or Instagram references using your industry and target country.",
    icon: Search,
  },
  {
    id: "link",
    title: "Use an existing video",
    description: "Paste a public TikTok or Instagram link, then review what the analyzer can observe.",
    icon: Link2,
  },
  {
    id: "idea",
    title: "Start with my own idea",
    description: "Describe the goal, audience, offer and style, then continue to the generation form.",
    icon: Sparkles,
  },
];

export function NewVideoStart(): ReactNode {
  const router = useRouter();
  const linkId = useId();
  const [option, setOption] = useState<Option>("trending");
  const [platform, setPlatform] = useState<"tiktok" | "instagram">("tiktok");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<{
    readonly source: string;
    readonly notes: string;
    readonly hook: string;
  } | null>(null);
  const [idea, setIdea] = useState({
    objective: "Promotion",
    audience: "",
    offering: "",
    country: "",
    style: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function searchTrends(event: FormEvent): void {
    event.preventDefault();
    const parts = [industry.trim(), country.trim()].filter(Boolean);
    if (parts.length === 0) {
      setError("Enter an industry or target country to focus the search.");
      return;
    }
    const term = parts.join(" ");
    const params = new URLSearchParams({ q: term, platform });
    router.push(`/dashboard/trends?${params.toString()}`);
  }

  function analyzeLink(event: FormEvent): void {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setAnalysis(null);
    startTransition(async () => {
      try {
        const found = await scrapePostFromUrl({ url });
        if (found.status !== "ok") {
          const message =
            found.status === "unrecognised"
              ? "Use a public TikTok or Instagram post link."
              : found.status === "not_found"
                ? "The post could not be found. It may be private, removed, or unavailable."
                : found.status === "unconfigured"
                  ? "Reference retrieval is not configured."
                  : found.message;
          setError(message);
          return;
        }
        const reviewed = await watchClip(found.post.url);
        if (!reviewed.ok) {
          setError(reviewed.message);
          return;
        }
        setAnalysis({
          source: found.post.url,
          notes: reviewed.notes,
          hook: found.post.caption.slice(0, 250),
        });
        setNotice("Analysis is ready. Edit the inspiration notes below before carrying them into your own brief.");
      } catch {
        setError("The reference could not be processed because of a connection problem. Try again.");
      }
    });
  }

  function continueFromAnalysis(): void {
    if (!analysis) return;
    const params = new URLSearchParams({
      objective: "Promotion",
      style: "Original social video inspired by a reference",
      hook: analysis.hook,
      sceneVisual: analysis.notes.slice(0, 500),
      source: "reference",
    });
    router.push(`/dashboard/videos/new?${params.toString()}`);
  }

  function continueFromIdea(event: FormEvent): void {
    event.preventDefault();
    const parsed = ideaSchema.safeParse(idea);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the idea details.");
      return;
    }
    const params = new URLSearchParams({
      objective: parsed.data.objective,
      audience: parsed.data.audience,
      offering: parsed.data.offering,
      country: parsed.data.country,
      style: parsed.data.style,
      source: "idea",
    });
    router.push(`/dashboard/videos/new?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Creation flow</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Start a new video</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Choose a starting point. References are inspiration only; do not copy another creator&apos;s work or likeness without permission.
        </p>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {OPTIONS.map((item) => {
          const selected = item.id === option;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setOption(item.id);
                setError(null);
              }}
              className={`min-h-32 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? "border-primary bg-primary/5" : "border-hairline bg-paper hover:bg-cloud/60"
              }`}
            >
              <item.icon className="size-5 text-primary" aria-hidden />
              <span className="mt-3 block text-sm font-semibold text-ink">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{item.description}</span>
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-hairline bg-paper p-4 sm:p-6">
        {option === "trending" ? (
          <form onSubmit={searchTrends} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Search for reference videos</h2>
              <p className="mt-1 text-sm text-ink-soft">
                The current discovery API accepts a platform and search phrase. Industry and country are included in that phrase; a separate regional filter and human/product classification are not yet available.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={LABEL}>
                Industry or topic
                <input className={FIELD} value={industry} onChange={(event) => setIndustry(event.target.value)} maxLength={80} placeholder="e.g. skincare, food, fitness" />
              </label>
              <label className={LABEL}>
                Target country
                <input className={FIELD} value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} placeholder="e.g. Singapore" />
              </label>
              <label className={LABEL}>
                Platform
                <select className={FIELD} value={platform} onChange={(event) => setPlatform(event.target.value as "tiktok" | "instagram")}>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram Reels</option>
                </select>
              </label>
            </div>
            <Button type="submit"><Search aria-hidden />Search references</Button>
          </form>
        ) : null}

        {option === "link" ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Analyze a reference link</h2>
              <p className="mt-1 text-sm text-ink-soft">
                The analyzer returns its available summary, scene notes, and speech. Review and edit the notes before using them in a new brief.
              </p>
            </div>
            <form onSubmit={analyzeLink} className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor={linkId} className="sr-only">TikTok or Instagram link</label>
              <input id={linkId} className={`${FIELD} mt-0 flex-1`} type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a public TikTok or Instagram URL" />
              <Button type="submit" disabled={pending}>
                {pending ? "Analyzing…" : "Retrieve and analyze"}
              </Button>
            </form>
            {analysis ? (
              <div className="space-y-4 rounded-xl border border-hairline bg-cloud/30 p-4">
                <p role="status" className="text-sm text-success">{notice}</p>
                <a href={analysis.source} target="_blank" rel="noreferrer" className="break-all text-xs text-primary underline underline-offset-2">
                  Reference source
                </a>
                <label className={LABEL}>
                  Editable analysis notes
                  <textarea className={`${FIELD} min-h-40 resize-y`} value={analysis.notes} onChange={(event) => setAnalysis((current) => current ? { ...current, notes: event.target.value } : current)} maxLength={5000} />
                </label>
                <label className={LABEL}>
                  Opening hook (optional)
                  <input className={FIELD} value={analysis.hook} onChange={(event) => setAnalysis((current) => current ? { ...current, hook: event.target.value } : current)} maxLength={250} />
                </label>
                <p className="text-xs text-ink-soft">
                  Reference analysis costs credits under the existing service policy. The generated brief uses your edited notes as text; it does not reproduce the source video, music, or creator likeness.
                </p>
                <Button type="button" onClick={continueFromAnalysis}>Continue to configure <ArrowRight aria-hidden /></Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {option === "idea" ? (
          <form onSubmit={continueFromIdea} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Describe your video idea</h2>
              <p className="mt-1 text-sm text-ink-soft">A structured brief, not a chatbot. You can edit scenes and speech in the next step.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={LABEL}>
                Objective
                <select className={FIELD} value={idea.objective} onChange={(event) => setIdea((current) => ({ ...current, objective: event.target.value }))}>
                  {["Promotion", "Brand awareness", "Education", "Product demonstration", "Other"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className={LABEL}>
                Target audience
                <input className={FIELD} required maxLength={300} value={idea.audience} onChange={(event) => setIdea((current) => ({ ...current, audience: event.target.value }))} placeholder="Who should this reach?" />
              </label>
              <label className={LABEL}>
                Product or service
                <input className={FIELD} required maxLength={300} value={idea.offering} onChange={(event) => setIdea((current) => ({ ...current, offering: event.target.value }))} placeholder="What are you featuring?" />
              </label>
              <label className={LABEL}>
                Target country
                <input className={FIELD} required maxLength={100} value={idea.country} onChange={(event) => setIdea((current) => ({ ...current, country: event.target.value }))} placeholder="e.g. Singapore" />
              </label>
              <label className={`${LABEL} sm:col-span-2`}>
                Preferred style
                <input className={FIELD} required maxLength={200} value={idea.style} onChange={(event) => setIdea((current) => ({ ...current, style: event.target.value }))} placeholder="e.g. friendly, product-led, documentary" />
              </label>
            </div>
            <Button type="submit">Continue to configure <ArrowRight aria-hidden /></Button>
          </form>
        ) : null}

        {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      </section>

      <p className="mt-5 text-xs text-ink-soft">
        The generation service currently returns one short scene per request. This flow carries your brief forward; it does not create a multi-scene provider plan automatically.
      </p>
      <Link href="/dashboard/videos/new" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-2">
        <Clapperboard className="size-4" aria-hidden />Open generation form directly
      </Link>
    </div>
  );
}
