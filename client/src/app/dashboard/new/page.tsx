import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";

import { LinkPanel } from "@/features/new-video/components/link-panel";
import { OwnIdeaPanel } from "@/features/new-video/components/own-idea-panel";
import { TrendingPanel } from "@/features/new-video/components/trending-panel";
import { AvatarPackPanel } from "@/features/new-video/components/avatar-pack-panel";

export const metadata: Metadata = { title: "New Video" };

const OPTIONS = [
  { id: "trending", title: "Find trending videos", body: "Search video references, preview them, and choose one to analyze." },
  { id: "link", title: "Use an existing video", body: "Paste a link, then choose when Gemini analyzes it." },
  { id: "idea", title: "Start with my own idea", body: "Describe the video in four fields." },
  { id: "avatar", title: "Use a saved avatar", body: "Generate with a consented face and cloned voice." },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

function isOption(value: string | undefined): value is OptionId {
  return OPTIONS.some((option) => option.id === value);
}

/** New Video entry: three starting points, no chat. */
export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string; link?: string }>;
}): Promise<ReactNode> {
  const { option, link } = await searchParams;
  const active = isOption(option) ? option : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">New Video</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick a starting point. Every path ends at the main generation page.</p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((item) => (
          <li key={item.id}>
            <Link
              href={(active === item.id ? "/dashboard/new" : `/dashboard/new?option=${item.id}`) as Route}
              aria-current={active === item.id ? "true" : undefined}
              className={`block h-full rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active === item.id
                  ? "border-primary bg-paper"
                  : "border-hairline bg-paper hover:bg-cloud/60"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      {active ? (
        <div className="mt-6 rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
          {active === "trending" ? <TrendingPanel /> : null}
          {active === "link" ? <LinkPanel initialUrl={link?.startsWith("https://") ? link : ""} /> : null}
          {active === "idea" ? <OwnIdeaPanel /> : null}
          {active === "avatar" ? <AvatarPackPanel /> : null}
        </div>
      ) : null}
    </div>
  );
}
