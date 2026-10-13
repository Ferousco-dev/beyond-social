import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ChatView } from "@/features/conversation/components/chat-view";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { threadResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Assistant" };
// A thread is per-user and changes on every message, so it is never cached.
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prompt?: string; link?: string }>;
}) {
  const { id } = await params;
  const { prompt = "", link = "" } = await searchParams;
  // A link from Discover arrives as text in the box, so the person can add what to change before sending.
  const seed = link.startsWith("https://") ? link.slice(0, 500) : prompt.slice(0, 2000);
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0] ?? user.name;

  if (id === "new") {
    return <ChatView conversationId={null} initialMessages={[]} initialPrompt={seed} firstName={firstName} />;
  }
  if (!z.string().uuid().safeParse(id).success) notFound();

  const thread = await goApi(`/api/v1/conversations/${id}`, threadResponse);
  if (!thread.ok) {
    if (thread.status === 404) notFound();
    throw new Error(thread.message);
  }
  return (
    <ChatView
      conversationId={id}
      initialMessages={thread.data.data.messages}
      initialPrompt=""
      firstName={firstName}
    />
  );
}
