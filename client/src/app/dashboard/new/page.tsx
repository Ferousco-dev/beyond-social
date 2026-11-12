import { type Metadata } from "next";
import { type ReactNode } from "react";

import { NewVideoOptions } from "@/features/new-video/components/new-video-options";
import { NEW_VIDEO_OPTIONS, type NewVideoOptionId } from "@/features/new-video/options";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "New Video" };

function isOption(value: string | undefined): value is NewVideoOptionId {
  return NEW_VIDEO_OPTIONS.some((option) => option.id === value);
}

/** New Video entry: four starting points, no chat. */
export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string; link?: string; job?: string; stage?: string }>;
}): Promise<ReactNode> {
  const [{ option, link, job, stage }, user] = await Promise.all([searchParams, getCurrentUser()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">New Video</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick a starting point. Every path ends at the main generation page.</p>
      <NewVideoOptions
        // A real navigation here (a sidebar draft, a shared link) starts the panel afresh.
        key={`${option ?? ""}|${link ?? ""}|${job ?? ""}|${stage ?? ""}`}
        initialOption={isOption(option) ? option : null}
        signupIndustry={user.industry}
        plan={user.plan}
        initialUrl={link?.startsWith("https://") ? link : ""}
        resumeJobId={job}
        resumeStage={stage === "preview" || stage === "analysis" ? stage : undefined}
      />
    </div>
  );
}
