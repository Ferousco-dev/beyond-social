import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { NewProjectButton } from "@/features/studio/components/projects/new-project-button";
import { goApi } from "@/lib/go-api/client";
import { editorSummariesResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/editor/projects", editorSummariesResponse);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Projects</h1>
        <NewProjectButton />
      </div>
      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.message}
        </p>
      ) : result.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nothing yet. Start a project and it shows up here.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
          {result.data.data.map((project) => (
            <li key={project.id}>
              <Link
                href={`/editor/${project.id}` as Route}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="truncate text-ink">{project.title}</span>
                <time dateTime={project.updated_at} className="shrink-0 text-xs text-ink-soft">
                  {new Date(project.updated_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
