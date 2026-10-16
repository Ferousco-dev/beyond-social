import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { emptyProject } from "@/features/studio/core/validate.ts";
import { projectGenerationSchema } from "@/features/studio/core/types.ts";
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
  const { title, version } = project.data.data;
  const rawDocument = project.data.data.document;
  const documentRecord = z.record(z.string(), z.unknown()).safeParse(rawDocument);
  const storedGeneration = documentRecord.success
    ? projectGenerationSchema.safeParse(documentRecord.data.generation)
    : null;
  const queryGeneration = typeof job === "string" && typeof script === "string"
    ? projectGenerationSchema.safeParse({ jobId: job, script, state: "running" })
    : null;
  const generation = storedGeneration?.success
    ? storedGeneration.data
    : queryGeneration?.success
      ? queryGeneration.data
      : undefined;
  const isBlank = documentRecord.success && Object.keys(documentRecord.data).every((key) => key === "generation");
  const document = isBlank ? emptyProject(generation) : rawDocument;

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
