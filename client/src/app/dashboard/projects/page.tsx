import { type Metadata } from "next";
import { type ReactNode } from "react";

import { CreatedVideoGrid } from "@/features/dashboard/components/recent-video-grid";
import { loadVideos } from "@/features/dashboard/video-page-actions";

export const metadata: Metadata = { title: "Projects" };

/**
 * Finished videos, fifteen to a page. One request for metadata: the server
 * already says which editor project holds each video, so nothing else is
 * fetched, and no video file is downloaded to draw the list.
 */
export default async function ProjectsPage(): Promise<ReactNode> {
  const page = await loadVideos(0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
      <p className="mt-1 text-sm text-ink-soft">Open a video to keep editing it.</p>

      {!page.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{page.message}</p>
      ) : (
        <CreatedVideoGrid initial={page.items} hasMore={page.hasMore} />
      )}
    </div>
  );
}
