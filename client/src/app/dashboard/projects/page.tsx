import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";
import { z } from "zod";

import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const projectsResponse = z.object({
  data: z.array(z.object({ id: z.string().uuid(), title: z.string(), updated_at: z.string() })),
});
const generationHistoryResponse = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    status: z.enum(["queued", "running", "completed", "failed", "ready"]),
    stage: z.string().optional(),
    progress: z.number(),
    error: z.string().optional(),
    created_at: z.string(),
  })),
});

function updatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ProjectsPage(): Promise<ReactNode> {
  const [result, history] = await Promise.all([
    goApi("/api/v1/editor/projects", projectsResponse),
    goApi("/api/v1/jobs?limit=100", generationHistoryResponse),
  ]);
  const generations = history.ok
    ? history.data.data.filter((job) => job.type === "video_generate" || job.type === "avatar_video")
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-soft">Your saved video projects, including work in progress.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard/library" className="text-primary underline underline-offset-4">Finished videos</Link>
          <Link href="/dashboard/new" className="text-primary underline underline-offset-4">New video</Link>
        </div>
      </div>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">{result.message}</p>
      ) : result.data.data.length === 0 ? (
        <p className="mt-6 border-y border-hairline py-6 text-sm text-ink-soft">No saved projects yet. Start a new video to create one.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {result.data.data.map((project) => (
            <li key={project.id}>
              <Link href={`/editor/${project.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-3 text-ink hover:text-primary">
                <span className="min-w-0 truncate text-sm font-medium">{project.title || "Untitled project"}</span>
                <time className="shrink-0 text-xs text-ink-soft" dateTime={project.updated_at}>Updated {updatedAt(project.updated_at)}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="generation-history-heading">
        <h2 id="generation-history-heading" className="text-lg font-semibold text-ink">Generation history</h2>
        <p className="mt-1 text-sm text-ink-soft">Recent video jobs, including failed attempts.</p>
        {!history.ok ? (
          <p role="alert" className="mt-4 text-sm text-destructive">{history.message}</p>
        ) : generations.length === 0 ? (
          <p className="mt-4 border-y border-hairline py-4 text-sm text-ink-soft">No video generations yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {generations.map((job) => (
              <li key={job.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {job.type === "avatar_video" ? "Avatar video" : "AI video"}
                    <span className="ml-2 font-normal capitalize text-ink-soft">{job.status.replaceAll("_", " ")}</span>
                  </p>
                  <p className="mt-1 break-words text-sm text-ink-soft">
                    {job.status === "failed"
                      ? job.error || "Generation failed."
                      : job.status === "completed" || job.status === "ready"
                        ? "Video generated successfully."
                        : job.stage || `Generation in progress · ${job.progress}%`}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-ink-soft" dateTime={job.created_at}>{updatedAt(job.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}