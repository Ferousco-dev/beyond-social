import { type Metadata } from "next";

import { ConversationThread } from "@/features/dashboard/components/conversation-thread";

export const metadata: Metadata = { title: "Project" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationThread conversationId={id} />;
}
