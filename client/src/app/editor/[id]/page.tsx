import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StudioScreen } from "@/features/studio/components/studio-screen";
import { goApi } from "@/lib/go-api/client";
import { editorProjectResponse, libraryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [project, library] = await Promise.all([
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

  return (
    <StudioScreen
      id={id}
      title={title}
      version={version}
      document={document}
      library={library.ok ? library.data.data : []}
    />
  );
}
