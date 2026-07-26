import { type Metadata } from "next";

import { EditorShell } from "@/features/editor/components/editor-shell";
import { getThread } from "@/lib/chat/thread";
import { getEditorDocument } from "@/lib/editor/document";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [thread, document] = await Promise.all([getThread(id), getEditorDocument(id)]);

  return (
    <EditorShell
      conversationId={id}
      title={thread.title}
      initialProject={document.project}
      initialRevision={document.revision}
      // A project that does not exist has nothing to attach a document to, so
      // autosave stays off rather than failing on every keystroke.
      canSave={thread.projectId !== null}
    />
  );
}
