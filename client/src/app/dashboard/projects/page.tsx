import { type Metadata } from "next";
import { type ReactNode } from "react";

import { CreatedVideoGrid } from "@/features/dashboard/components/recent-video-grid";
import { goApi } from "@/lib/go-api/client";
import { libraryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage(): Promise<ReactNode> {
  const library = await goApi("/api/v1/library?limit=100", libraryResponse);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-soft">Videos you have created.</p>
      </div>

      {!library.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{library.message}</p>
      ) : (
        <CreatedVideoGrid items={library.data.data} />
      )}
    </div>
  );
}