import { type Metadata } from "next";

import { ConversationThread } from "@/features/dashboard/components/conversation-thread";
import { getThread } from "@/lib/chat/thread";

export const metadata: Metadata = { title: "Project" };
// The thread is per-user and changes on every turn, so it is never cached.
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id);

  return <ConversationThread thread={thread} />;
}
