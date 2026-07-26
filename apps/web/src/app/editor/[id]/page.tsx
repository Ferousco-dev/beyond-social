import { type Metadata } from "next";

import { EditorShell } from "@/features/editor/components/editor-shell";
import { getThread } from "@/lib/chat/thread";

export const metadata: Metadata = { title: "Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The title was hardcoded, so every project opened the editor calling itself
  // "Trail shoe launch teaser" regardless of what the user had actually made.
  const thread = await getThread(id);

  return <EditorShell conversationId={id} title={thread.title} />;
}
