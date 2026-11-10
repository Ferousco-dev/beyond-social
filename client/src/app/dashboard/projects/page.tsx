import { type Metadata } from "next";
import Link from "next/link";
import { type Route } from "next";
import { type ReactNode } from "react";
import { z } from "zod";

import { CreatedVideoGrid } from "@/features/dashboard/components/recent-video-grid";
import { goApi } from "@/lib/go-api/client";
import { libraryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});

export default async function ProjectsPage(): Promise<ReactNode> {
  // Both lists load together; neither waits on the other.
  const [projects, library] = await Promise.all([
    goApi("/api/v1/editor/projects", projectsResponse),
    goApi("/api/v1/library?limit=100", libraryResponse),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-soft">Open a project to keep editing it.</p>
      </div>

      {!projects.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{projects.message}</p>
      ) : projects.data.data.length === 0 ? (
        <p className="mt-6 border-y border-hairline py-6 text-sm text-ink-soft">Your projects will appear here.</p>
      ) : (
        <ul aria-label="Projects" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.data.map((project) => (
            <li key={project.id} className="rounded-lg border border-hairline bg-paper transition-colors hover:border-primary/40">
              {/* The project itself: its editor, not the library. */}
              <Link
                href={`/editor/${project.id}` as Route}
                className="block px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="block truncate text-sm font-medium text-ink">{project.title || "Untitled project"}</span>
                <span className="mt-1 block text-xs text-ink-soft">
                  Edited {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold tracking-tight text-ink">Rendered videos</h2>
      {!library.ok ? (
        <p role="alert" className="mt-3 text-sm text-destructive">{library.message}</p>
      ) : (
        <CreatedVideoGrid items={library.data.data} />
      )}
    </div>
  );
}
