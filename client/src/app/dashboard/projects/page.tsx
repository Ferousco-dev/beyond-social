import { Plus } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";
import { z } from "zod";

import { ProjectsGrid } from "@/features/dashboard/components/projects-grid";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Projects" };

const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string(), has_video: z.boolean().optional() })),
});

export default async function ProjectsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/editor/projects?limit=60", projectsResponse);
  const projects = result.ok
    ? [...result.data.data]
        // Only projects that hold a video. An older API that does not say is trusted.
        .filter((item) => item.has_video !== false)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((item) => ({
          id: item.id,
          title: item.title || "Untitled project",
          updatedAt: item.updated_at,
        }))
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-soft">Your videos, ready to edit.</p>
        </div>
        <Link
          href="/dashboard/new"
          className="btn btn-primary btn-md"
        >
          <Plus className="size-4" aria-hidden />
          New video
        </Link>
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{result.message}</p>
      ) : (
        <ProjectsGrid projects={projects} />
      )}
    </div>
  );
}
