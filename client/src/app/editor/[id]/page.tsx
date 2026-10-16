import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { emptyProject } from "@/features/studio/core/validate.ts";
import { StudioScreen } from "@/features/studio/components/studio-screen";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { editorProjectResponse, libraryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string; script?: string }>;
}) {
  const { id } = await params;
  const { job, script } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [user, project, library] = await Promise.all([
    getCurrentUser(),
    goApi(`/api/v1/editor/projects/${id}`, editorProjectResponse),
    goApi("/api/v1/library?limit=100", libraryResponse),
  ]);
  if (!project.ok) {
    if (project.status === 404) notFound();
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {project.message}
      </p>
    );
  }
  const { title, version, document } = project.data.data;
  // A new project has no timeline until a video or asset is added.
  const isBlank = typeof document === "object" && document !== null && Object.keys(document).length === 0;
  const generation = typeof job === "string" && z.string().uuid().safeParse(job).success && typeof script === "string"
    ? { jobId: job, script }
    : undefined;

  return (
    <StudioScreen
      id={id}
      title={title}
      version={version}
      document={isBlank ? emptyProject() : document}
      plan={user.plan}
      backHref="/dashboard/new"
      library={library.ok ? library.data.data : []}
      chatLibrary={[]}
      generation={generation}
    />
  );
}
