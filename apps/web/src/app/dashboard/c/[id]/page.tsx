import { type Metadata } from "next";

import { ConversationThread } from "@/features/dashboard/components/conversation-thread";
import { findProject } from "@/lib/dashboard/data";

export const metadata: Metadata = { title: "Project" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = id === "new" ? "New project" : (findProject(id)?.title ?? "Project");
  return <ConversationThread conversationId={id} title={title} />;
}
