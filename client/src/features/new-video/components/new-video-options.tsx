"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { NEW_VIDEO_OPTIONS, type NewVideoOptionId } from "../options";
import { AvatarPackPanel } from "./avatar-pack-panel";
import { LinkPanel } from "./link-panel";
import { OwnIdeaPanel } from "./own-idea-panel";
import { TrendingPanel } from "./trending-panel";

/**
 * The starting points and the open panel.
 *
 * Switching happens here, not through a navigation, so a click answers at
 * once; the URL is still updated so a reload or a shared link reopens the
 * same panel.
 */
export function NewVideoOptions({
  initialOption,
  signupIndustry,
  plan,
  initialUrl,
  resumeJobId,
  resumeStage,
}: {
  initialOption: NewVideoOptionId | null;
  signupIndustry: string;
  plan: "free" | "pro";
  initialUrl: string;
  resumeJobId?: string;
  resumeStage?: "preview" | "analysis";
}) {
  const [active, setActive] = useState<NewVideoOptionId | null>(initialOption);

  function choose(id: NewVideoOptionId): void {
    const next = active === id ? null : id;
    setActive(next);
    window.history.pushState(null, "", next ? `/dashboard/new?option=${next}` : "/dashboard/new");
  }

  return (
    <>
      <ul className="mt-6 grid gap-2 sm:grid-cols-3">
        {NEW_VIDEO_OPTIONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => choose(item.id)}
              aria-pressed={active === item.id}
              className={cn(
                "block h-full w-full cursor-pointer rounded-2xl border bg-paper p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active === item.id ? "border-primary" : "border-hairline hover:bg-cloud/60",
              )}
            >
              <span className="block text-sm font-semibold text-ink">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{item.body}</span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div className="mt-6 rounded-2xl border border-hairline bg-paper p-4 sm:p-5">
          {active === "trending" ? <TrendingPanel signupIndustry={signupIndustry} plan={plan} /> : null}
          {active === "link" ? <LinkPanel initialUrl={initialUrl} resumeJobId={resumeJobId} resumeStage={resumeStage} /> : null}
          {active === "idea" ? <OwnIdeaPanel /> : null}
          {active === "avatar" ? <AvatarPackPanel /> : null}
        </div>
      ) : null}
    </>
  );
}
