"use client";

import { useState } from "react";

import { NEW_VIDEO_OPTIONS, type NewVideoOptionId } from "../options";
import { CardArt } from "./card-art";
import { FirstRunHint } from "./first-run-hint";
import { OptionSheet } from "./option-sheet";
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
    try {
      window.localStorage.setItem("bs:new-video-hint-dismissed", "1");
    } catch {
      // The tip shows again next time.
    }
    const next = active === id ? null : id;
    setActive(next);
    window.history.pushState(null, "", next ? `/dashboard/new?option=${next}` : "/dashboard/new");
  }

  const current = NEW_VIDEO_OPTIONS.find((item) => item.id === active) ?? null;

  return (
    <>
      <FirstRunHint hidden={active !== null} />
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {NEW_VIDEO_OPTIONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => choose(item.id)}
              className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-hairline bg-paper text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="block h-24 w-full bg-cloud/70 p-3 sm:h-28">
                <CardArt id={item.id} />
              </span>
              <span className="block p-3.5 sm:p-4">
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{item.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <OptionSheet
        open={current !== null}
        title={current?.title ?? ""}
        description={current?.body ?? ""}
        onClose={() => choose(active as NewVideoOptionId)}
      >
        {active === "trending" ? <TrendingPanel signupIndustry={signupIndustry} plan={plan} /> : null}
        {active === "link" ? <LinkPanel initialUrl={initialUrl} resumeJobId={resumeJobId} resumeStage={resumeStage} /> : null}
        {active === "idea" ? <OwnIdeaPanel /> : null}
        {active === "avatar" ? <AvatarPackPanel /> : null}
      </OptionSheet>
    </>
  );
}
