import { type Metadata } from "next";

import { EditorShell } from "@/features/editor/components/editor-shell";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorShell conversationId={id} title="Trail shoe launch teaser" />;
}
