import { type Metadata } from "next";

import { EditorShell } from "@/features/editor/components/editor-shell";
import { getThread } from "@/lib/chat/thread";
import { getEditorDocument } from "@/lib/editor/document";
import { getLatestReadyGeneration } from "@/lib/generation/history";
import { configuredPlatforms } from "@/lib/social/platforms";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [thread, document, generationId] = await Promise.all([
    getThread(id),
    getEditorDocument(id),
    getLatestReadyGeneration(id),
  ]);

  return (
    <EditorShell
      conversationId={id}
      title={thread.title}
      initialProject={document.project}
      initialRevision={document.revision}
      // A project that does not exist has nothing to attach a document to, so
      // autosave stays off rather than failing on every keystroke.
      canSave={thread.projectId !== null}
      generationId={generationId}
      // Read on the server: the credentials are server-only, so the client is
      // told which platforms are usable rather than being able to work it out.
      availablePlatforms={configuredPlatforms()}
    />
  );
}
