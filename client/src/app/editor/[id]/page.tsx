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

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [user, project, library] = await Promise.all([
    getCurrentUser(),
    goApi(`/api/v1/editor/projects/${id}`, editorProjectResponse),
    goApi("/api/v1/library?limit=100", libraryResponse),
  ]);
  // The videos the chat this project came from made, so they are the first thing offered.
  const chatId = project.ok ? project.data.data.conversation_id : undefined;
  const fromChat = chatId ? await goApi(`/api/v1/library?conversation=${chatId}&limit=50`, libraryResponse) : null;
  if (!project.ok) {
    if (project.status === 404) notFound();
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {project.message}
      </p>
    );
  }
  const { title, version, document, conversation_id } = project.data.data;
  // A project just opened from a chat has no timeline yet.
  const isBlank = typeof document === "object" && document !== null && Object.keys(document).length === 0;

  return (
    <StudioScreen
      id={id}
      title={title}
      version={version}
      document={isBlank ? emptyProject() : document}
      plan={user.plan}
      backHref={conversation_id ? `/dashboard/c/${conversation_id}` : "/dashboard/c/new"}
      library={library.ok ? library.data.data : []}
      chatLibrary={fromChat?.ok ? fromChat.data.data : []}
    />
  );
}
