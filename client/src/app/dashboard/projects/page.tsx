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

function updatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function ProjectsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/editor/projects", projectsResponse);

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
    </div>
  );
}